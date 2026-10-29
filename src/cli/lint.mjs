#!/usr/bin/env node
/**
 * The lint. Every rule has a name, and every name has a section in
 * docs/anti-patterns.md that explains it — `test/lint-rules.test.mjs` fails if the two
 * lists stop matching. The document is the reasoning; this file is what stops a
 * failing page shipping.
 *
 * `node src/cli/lint.mjs <site>` checks the library and one site together, because a
 * site's blocks/ and theme.css are as much part of the result as the library is. The
 * site is a name or a path, resolved the way `src/cli/dev.mjs` resolves one.
 */

import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  BASE_THEME,
  BREAKPOINTS,
  COLOR_SCHEMES,
  COMPONENT_TOKEN_NAMES,
  COMPONENT_TOKENS,
  LAYERS,
  MIN_TAP_TARGET_PX,
  ROLES,
  ROLE_NAMES,
  SURFACE_ROLES,
  THEMEABLE,
  THEME_METADATA,
  THEME_NAME,
} from '../tokens/contract.js';
import { iconNames } from '../icons.js';
import { siteThemes } from '../themes.js';
import { isMain, knownSites, locate, takeSitesFlag } from './sites.js';
import { librarySheets, stripCssComments } from './build.mjs';
import { filesBelow } from './files.js';
import { parseColor, over, contrast } from './colors.js';
import { componentsIn, TIER_NAMES } from './components.js';

const LIB = fileURLToPath(new URL('../../', import.meta.url));

/**
 * Every rule, in three groups that answer "why can I not do this".
 *
 *   standard      A published accessibility requirement. Not a house opinion, not
 *                 negotiable, and the citation is in the docs beside it.
 *   house         A decision this system made once so that nobody re-decides it per
 *                 site. Argue with it in docs/anti-patterns.md, not in a stylesheet.
 *   architecture  The line between what the library owns and what a site owns.
 *                 Crossing it is what makes a design system rot back into three sites.
 *
 * The name is what the failure prints, so `node src/cli/lint.mjs` reads as a sentence
 * rather than as a table of numbers to look up.
 */
export const RULES = {
  contrast: { group: 'standard', summary: 'Unreadable text, and boundaries that are not there' },
  'focus-visible': { group: 'standard', summary: 'An interactive element with no visible focus' },
  'reduced-motion': { group: 'standard', summary: 'Motion with no way out' },
  'tap-target': { group: 'standard', summary: 'A tap target under the standard' },
  'no-js-content': { group: 'standard', summary: 'A page that needs JavaScript to say anything' },

  scale: { group: 'house', summary: 'A size that is not on a scale' },
  'theme-color': { group: 'house', summary: 'Color outside the theme' },
  gradient: { group: 'house', summary: 'A gradient with no reason' },
  glass: { group: 'house', summary: 'Glass with nothing behind it' },
  'scroll-animation': { group: 'house', summary: 'Animation driven by scrolling' },
  'hollow-claims': { group: 'house', summary: 'Marketing words that survive no edit' },
  breakpoint: { group: 'house', summary: 'A fourth breakpoint' },

  'theme-contract': { group: 'architecture', summary: 'A site token outside the contract' },
  'page-markup': { group: 'architecture', summary: 'A page that writes markup by hand' },
  'token-default': { group: 'architecture', summary: 'A component token that lies about its default' },
  'token-assignment': { group: 'architecture', summary: 'A library rule that assigns a site component token' },
  'component-boundary': { group: 'architecture', summary: 'A component stylesheet that selects a neighbor' },
  layer: { group: 'architecture', summary: 'A stylesheet that assigns its own cascade layer' },
  assets: { group: 'architecture', summary: 'Unversioned or duplicated assets' },
  'og-image': { group: 'architecture', summary: 'A configured share image that is missing' },
};

export const RULE_NAMES = Object.keys(RULES);

/*
 * Where the current run collects its failures. `lint()` owns the array and puts it
 * back when it is done, rather than every rule taking a collector as an argument: the
 * whole run is synchronous, so there is exactly one in flight at a time. What this
 * fixes is a `failures` array that lived for the life of the module — two runs in one
 * process (the tests do that) had to trust each other to clear it first.
 */
let collecting = null;

const fail = (rule, where, detail) => {
  if (!RULES[rule]) {
    throw new Error(`lint reported "${rule}", which is not a declared rule — add it to RULES`);
  }

  collecting.push({ rule, where, detail });
};

/* --- file collection --------------------------------------------------------- */

const read = (path) => readFileSync(path, 'utf8');
const label = (path) => relative(LIB, path).replace(/^(\.\.\/)+/, '');

/** Keep comment offsets so an exception belongs to the next declaration only. */
function styleSource(source) {
  const comments = [];
  const css = source.replace(/"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|\/\*[\s\S]*?\*\//g, (text, index) => {
    if (!text.startsWith('/*')) return text;
    comments.push({ end: index + text.length, body: text.slice(2, -2) });
    return text.replace(/[^\r\n]/g, ' ');
  });
  const declarations = [...css.replaceAll(MEDIA_PRELUDE, (text) => ' '.repeat(text.length)).matchAll(DECLARATION)]
    .map((match) => ({
      property: match[1], value: match[2], text: `${match[1]}: ${match[2].trim()}`,
      start: match.index + match[0].indexOf(match[1]), exceptions: new Set(),
    }));
  const byStart = new Map(declarations.map((declaration) => [declaration.start, declaration]));

  for (const { end, body } of comments) {
    const marker = body.replace(/^\s*\* ?/gm, '').trim()
      .match(/^ds-allow:\s*(length|type|layer|color|gradient|backdrop)\s+—\s*(\S[\s\S]*)$/);
    if (!marker) continue;
    const next = css.slice(end).match(/^\s*([-\w]+)\s*:/);
    if (next) byStart.get(end + next[0].indexOf(next[1]))?.exceptions.add(marker[1]);
  }

  return { css, declarations };
}

/* --- rules -------------------------------------------------------------------- */

/*
 * scale. Every declaration in the library, not only the spacing ones.
 *
 * A CSS length is a value somebody chose; the scales in src/tokens/primitives.css are
 * the values the system has already chosen. Percentages, `fr` and unitless numbers
 * are structural — `width: 100%`, `1fr`, `* -1` describe a relationship, not a size
 * — and are left alone.
 */
const DECLARATION = /(?:^|[;{])\s*([-\w]+)\s*:\s*([^;{}]+)/gm;
const RAW_LENGTH = /-?\d*\.?\d+(?:px|rem|em|ch|ex|cap|ic|lh|rlh|vw|vh|vi|vb|vmin|vmax|svw|svh|svi|svb|lvw|lvh|lvi|lvb|dvw|dvh|dvi|dvb|cm|mm|Q|in|pc|pt)/;
/* The declarations that set a page's rhythm, which even a block has to take from the scale. */
const RHYTHM = /^(?:margin|padding|gap|row-gap|column-gap|border-radius)(?:-[\w-]+)?$/;
/* Typography is fixed even inside a site's otherwise free-form visual blocks. */
const TYPOGRAPHY = new Map([
  ['font-family', /^var\(--ds-font-[\w-]+\)$/],
  ['font-size', /^var\(--ds-text-[\w-]+\)$/],
  ['font-weight', /^var\(--ds-(?:weight-[\w-]+|[\w-]+-weight)(?:,\s*var\(--ds-weight-[\w-]+\))?\)$/],
  ['line-height', /^var\(--ds-leading-[\w-]+\)$/],
  ['letter-spacing', /^(?:normal|var\(--ds-tracking-[\w-]+\))$/],
]);
/*
 * Stacking order is a scale too, and the one scale a raw value breaks quietly: a
 * number raised until it worked covers the header on somebody else's page. It is
 * checked in a site's blocks as well as in the library, for that reason.
 */
const STACKING = /^z-index$/;
const LAYER = /^var\(--ds-layer-[\w-]+\)$/;
/* A media query is the one place CSS cannot read a token. `breakpoint` checks those. */
const MEDIA_PRELUDE = /@media[^{]+/g;
const COLOR = /(?:^|[;{\s(])(#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|oklch\([^)]*\))/g;
/*
 * Translucent pure black and pure white are shading — a shadow, a sheen, a hairline
 * over an unknown backdrop. They carry no brand and survive any retheme, so they are
 * not what `theme-color` is about.
 */
const SHADE = /^rgba?\(\s*(?:0\s*[,\s]\s*0\s*[,\s]\s*0|255\s*[,\s]\s*255\s*[,\s]\s*255)\s*[/,]/;

function checkScale(declarations, file, strict) {
  for (const { property, value, text, exceptions } of declarations) {
    const rhythm = RHYTHM.test(property);
    const typography = TYPOGRAPHY.get(property);

    if ((strict || rhythm) && RAW_LENGTH.test(value) && !exceptions.has('length')) {
      fail('scale', label(file), `raw length in "${text.slice(0, 60)}"`);
    }

    if (typography && !typography.test(value.trim()) && !exceptions.has('type')) {
      fail('scale', label(file), `typography outside the type scale in "${text.slice(0, 60)}"`);
    }

    if (STACKING.test(property) && !LAYER.test(value.trim()) && !exceptions.has('layer')) {
      fail('scale', label(file), `stacking order outside the layer scale in "${text.slice(0, 60)}"`);
    }
  }
}

function checkBreakpoints(css, file) {
  for (const [, width] of css.matchAll(/@media[^{]*?\(\s*(?:min|max)-width\s*:\s*([^)]+)\)/g)) {
    if (!BREAKPOINTS.includes(width.trim())) {
      fail('breakpoint', label(file), `${width.trim()} is not one of ${BREAKPOINTS.join(', ')}`);
    }
  }
}

function checkColors(declarations, file) {
  for (const { value, exceptions } of declarations) {
    for (const match of value.matchAll(COLOR)) {
      if (!SHADE.test(match[1]) && !exceptions.has('color')) {
        fail('theme-color', label(file), `literal color ${match[1].slice(0, 40)}`);
      }
    }
  }
}

function checkStyleEffects(css, declarations, file) {
  // gradient / glass. Both need a stated reason, or they are decoration.
  for (const [rule, kind, pattern] of [
    ['gradient', 'gradient', /\b(?:linear|radial|conic)-gradient\s*\(/g],
    ['glass', 'backdrop', /backdrop-filter\s*:/g],
  ]) {
    for (const { text, exceptions } of declarations) {
      for (const match of text.matchAll(pattern)) {
        if (!exceptions.has(kind)) {
          fail(rule, label(file), match[0].trim());
        }
      }
    }
  }

  // scroll-animation. Content never animates because the page scrolled.
  for (const match of css.matchAll(/animation-timeline\s*:|\bscroll\(\)|\bview\(\)/g)) {
    fail('scroll-animation', label(file), match[0].trim());
  }

  // reduced-motion. Anything that moves says what it does for someone who asked it not to.
  const moves = /(?:^|[;{])\s*(?:transition|animation)\s*:/m.test(css);

  if (moves && !css.includes('prefers-reduced-motion')) {
    fail('reduced-motion', label(file), 'declares motion with no prefers-reduced-motion block');
  }

  /*
   * focus-visible. Removing the outline is legitimate — a control that draws its own
   * ring often has to. Removing it and drawing nothing is how a keyboard user loses
   * their place on the page, so the file that takes the ring away has to put one
   * back. WCAG 2.2 §2.4.7 Focus Visible and §2.4.13 Focus Appearance.
   */
  const removesOutline = /(?:^|[;{])\s*outline\s*:\s*(?:none|0)\b/m.test(css);

  if (removesOutline && !css.includes(':focus-visible')) {
    fail('focus-visible', label(file), 'removes the focus outline and draws no :focus-visible replacement');
  }
}

function checkStyles(files, { themeFiles, libraryFiles }) {
  for (const file of files) {
    const { css, declarations } = styleSource(read(file));
    if (!themeFiles.includes(file)) {
      checkScale(declarations, file, libraryFiles.includes(file));
      checkBreakpoints(css, file);
      checkColors(declarations, file);
    }
    checkStyleEffects(css, declarations, file);
  }
}

function checkScripts(files) {
  for (const file of files) {
    const source = read(file);

    for (const match of source.matchAll(/IntersectionObserver|onscroll|'scroll'|"scroll"/g)) {
      // The library's optional scroll-away header is navigation, not content motion.
      if (file === join(LIB, 'src/runtime/nav.js') && /^['"]scroll['"]$/.test(match[0])) continue;
      fail('scroll-animation', label(file), match[0]);
    }
  }
}

/**
 * theme-contract and contrast. What a palette is allowed to say, and whether the
 * colors it says it in can actually be read.
 *
 * A site has one palette or several, and the several are the same thing repeated: a
 * file that sets some of the same names. So this resolves each one against the base —
 * exactly the way the cascade will — and measures the result. A palette that changes
 * three colors is checked as a whole palette, because that is what a reader gets.
 *
 * The names, the ratios and the shape of a theme name all come from
 * src/tokens/contract.js, so this file, the docs table and the starter palettes cannot
 * drift apart: they are readings of one declaration rather than copies of a list.
 */
function checkThemeDeclaration(theme) {
  const where = label(theme.path);

  if (!COLOR_SCHEMES.includes(theme.scheme)) {
    fail('theme-contract', where, `color-scheme must be ${COLOR_SCHEMES.map((one) => `"${one}"`).join(' or ')}`);
  }

  for (const name of theme.declared.keys()) {
    if (!THEMEABLE.includes(name)) {
      fail('theme-contract', where, `--ds-${name} is not part of the contract — see src/tokens/contract.js`);
    }
  }

  /*
   * The build carries the `:root` block and nothing else, because a palette is a set
   * of values rather than a stylesheet. Reporting the remainder is what stops a site
   * writing a media query or a second selector here that silently never ships.
   */
  if (theme.stray) {
    fail('theme-contract', where, `a palette is one :root block — "${theme.stray.slice(0, 40).replace(/\s+/g, ' ')}" would not be built`);
  }

  if (theme.base) return checkBaseRoles(theme, where);

  /*
   * A palette is named by its file, and two names are promises: `light` and `dark`
   * are what `auto` resolves to for that system preference, so a file called dark
   * that is not dark would be handed to a reader whose system asked for the
   * opposite of what it gets.
   */
  if (!THEME_NAME.test(theme.name) || theme.name === BASE_THEME.name) {
    fail(
      'theme-contract',
      where,
      `"${theme.name}" cannot be a palette name — lowercase letters, digits and hyphens, and not "${BASE_THEME.name}"`,
    );
  }

  if (COLOR_SCHEMES.includes(theme.name) && theme.scheme !== theme.name) {
    fail('theme-contract', where, `a palette called "${theme.name}" is what auto uses for that scheme, so it has to declare color-scheme: ${theme.name}`);
  }

  if (!ROLE_NAMES.some((name) => theme.declared.has(name))) {
    fail('theme-contract', where, 'declares no color of its own — a palette that changes nothing is a choice that does nothing');
  }
}

function checkBaseRoles(theme, where) {
  for (const name of ROLE_NAMES) {
    if (!theme.declared.has(name)) fail('theme-contract', where, `the base palette does not set --ds-${name}`);
  }
}

function checkThemeIcon(theme) {
  const icon = theme.declared.has(THEME_METADATA.icon.token) ? theme.icon : null;

  if (icon && !iconNames().includes(icon)) {
    fail('theme-contract', label(theme.path), `--ds-${THEME_METADATA.icon.token}: "${icon}" is not a file in the installed SVG icon set`);
  }
}

function checkRoleContrast(role, resolved, where) {
  const against = role.on === 'surfaces' ? SURFACE_ROLES : role.on;
  const foreground = parseColor(resolved.get(role.name) ?? '');

  if (!foreground) {
    fail('contrast', where, `--ds-${role.name} cannot be measured — use a hex or rgb() value`);
    return;
  }

  for (const name of against) {
    const backdrop = parseColor(resolved.get(name) ?? '');

    if (!backdrop) {
      fail('contrast', where, `--ds-${name} cannot be measured — use a hex or rgb() value`);
      continue;
    }

    if (backdrop[3] < 1) {
      fail('contrast', where, `--ds-${name} is translucent; a surface has to be opaque to measure against`);
      continue;
    }

    // The backdrop is opaque by the check above; only the foreground needs compositing.
    const solid = backdrop.slice(0, 3);
    const ratio = contrast(over(foreground, solid), solid);

    if (ratio < role.min) {
      fail('contrast', where, `--ds-${role.name} on --ds-${name} is ${ratio.toFixed(2)}:1, under ${role.min}`);
    }
  }
}

function checkThemeContrast(theme, base) {
  const resolved = theme.base ? theme.declared : new Map([...base.declared, ...theme.declared]);
  for (const role of ROLES.filter((entry) => entry.min)) {
    checkRoleContrast(role, resolved, label(theme.path));
  }
}

function checkThemes(themes) {
  const [base, ...alternates] = themes;
  for (const theme of themes) checkThemeDeclaration(theme);
  for (const theme of themes) checkThemeIcon(theme);
  for (const theme of themes) checkThemeContrast(theme, base);

  // Two palettes offering themselves for the same system preference is a coin toss.
  const following = alternates.filter((theme) => theme.follows);

  for (const theme of following) {
    if (theme.follows === base.follows) {
      fail(
        'theme-contract',
        label(theme.path),
        `both this and ${label(base.path)} answer a ${theme.follows} system — rename it, and it becomes a palette the reader picks`,
      );
    }
  }
}

/** Site component-token values stay inside the scales and syntax each component token declares. */
function checkSiteTokens(files) {
  const tokens = new Map(COMPONENT_TOKENS.map((token) => [token.name, token]));

  for (const file of files) {
    const css = stripCssComments(read(file));

    for (const [, name, value] of css.matchAll(/--ds-([\w-]+)\s*:\s*([^;]+);/g)) {
      const token = tokens.get(name);

      if (!token) {
        continue;
      }

      const written = value.trim();
      const accepted = token.accepts.values?.includes(written) || token.accepts.pattern?.test(written);

      if (!accepted) {
        fail('theme-contract', label(file), `--ds-${name} accepts ${token.accepts.summary}, got "${written}"`);
      }
    }

    if (/--_[\w-]+\s*:/.test(css)) {
      fail('theme-contract', label(file), 'assigns a private --_ variable owned by the library');
    }
  }
}

/*
 * hollow-claims. A starting list, not a moral position: these are the words that read
 * as filler in every draft they appear in, because none of them names a thing the
 * product does. A site is free to add its own — the point is that a claim which
 * needs one of these is a claim with no demonstration behind it.
 */
const BANNED = [
  'seamless', 'seamlessly', 'effortless', 'effortlessly', 'empower', 'unleash',
  'elevate your', 'revolutionary', 'game-changing', 'game changing', 'cutting-edge',
  'next-gen', 'next-generation', 'military-grade', 'bank-level', 'peace of mind',
  'in today’s fast-paced', "in today's fast-paced", 'take control of your',
  'unlock the power', 'supercharge', 'delve into', 'seamless integration',
];

function checkCopy(files) {
  for (const file of files) {
    const lines = read(file).split('\n');

    lines.forEach((line, index) => {
      const lower = line.toLowerCase();

      for (const word of BANNED) {
        if (lower.includes(word)) {
          fail('hollow-claims', `${label(file)}:${index + 1}`, `"${word}"`);
        }
      }
    });
  }
}

/*
 * no-js-content and assets. What the build actually emitted.
 *
 * With no dist/ these two rules have nothing to read, and there is a difference
 * between "the output is wrong" and "there is no output yet" that the exit code has
 * to keep: a fresh clone has nothing wrong with it and must not fail the lint.
 * Returns whether it checked, so the caller can say the rules were skipped.
 */
function checkBuiltPage(path, distDir) {
  const file = relative(distDir, path).replace(/\\/g, '/');
  const markup = read(path);

  // no-js-content. A reader, a crawler or a model that runs no JavaScript sees the page.
  const text = markup
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length < 500) {
    fail('no-js-content', file, `only ${text.length} characters of text without JavaScript`);
  }

  if (!/<title>[^<]+<\/title>/.test(markup)) {
    fail('no-js-content', file, 'no <title>');
  }

  if (!/<meta name="description" content="[^"]+"/.test(markup)) {
    fail('no-js-content', file, 'no meta description');
  }

  // assets. One stylesheet, at most one script, both fingerprinted.
  const styles = [...markup.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(([, href]) => href);
  const scripts = [...markup.matchAll(/<script[^>]*src="([^"]+)"/g)].map(([, src]) => src);

  if (styles.length !== 1) {
    fail('assets', file, `links ${styles.length} stylesheets, expected 1`);
  }

  if (scripts.length > 1) {
    fail('assets', file, `links ${scripts.length} scripts, expected at most 1`);
  }

  for (const asset of [...styles, ...scripts]) {
    if (!/\.[0-9a-f]{8}\.(css|js)$/.test(asset)) {
      fail('assets', file, `${asset} is not content-hashed`);
    }
  }
}

function checkBuild(distDir) {
  if (!existsSync(distDir)) return false;
  const pages = filesBelow(distDir, '.html');
  if (!pages.length) fail('no-js-content', 'dist/', 'contains no HTML pages');
  for (const path of pages) checkBuiltPage(path, distDir);
  return true;
}

/**
 * page-markup. A page that writes markup by hand.
 *
 * The point of the component API is that a page has a closed vocabulary a machine can
 * check. Two things reopen it: importing the raw-markup entry point, and typing a
 * `ds-` class name. Both are legitimate inside blocks/, which is where a site's
 * own markup lives, and neither is legitimate in a page or a content file.
 */
function checkSiteCode(files) {
  for (const file of files) {
    const source = read(file);

    if (/from\s+['"]@jamshoot-apps\/design\/markup['"]/.test(source)) {
      fail('page-markup', label(file), 'imports the raw-markup entry point — that door is for blocks/ only');
    }

    for (const match of source.matchAll(/['"`][^'"`]*\bds-[a-z][\w-]*/g)) {
      fail(
        'page-markup',
        label(file),
        `writes a library class name in "${match[0].slice(0, 40)}" — call the component instead`,
      );
    }
  }
}

/**
 * token-default. A component token that does not default to what the contract says.
 *
 * The component tokens in src/tokens/contract.js are a promise: set none of them and you get the
 * house style. That promise lives in a `var(--ds-x, <fallback>)` in one stylesheet,
 * so this checks the stylesheet still says what the contract says.
 */
function checkComponentTokens(files) {
  const css = files.map(read).join('\n');

  for (const token of COMPONENT_TOKENS) {
    const uses = [...css.matchAll(new RegExp(`var\\(\\s*--ds-${token.name}\\s*(?:,([^)]*(?:\\([^)]*\\))?[^)]*))?\\)`, 'g'))];

    if (!uses.length) {
      fail('token-default', 'src/styles/', `--ds-${token.name} is in the contract but no stylesheet reads it`);
      continue;
    }

    // The house default, plus the one each modifier starts from — all declared.
    const promised = [token.fallback, ...(token.variants ?? [])];

    for (const [whole, fallback] of uses) {
      const written = (fallback ?? '').trim().replace(/^var\(\s*/, '').replace(/\s*\)$/, '');

      if (!promised.includes(written)) {
        fail('token-default', 'src/styles/', `${whole.trim()} should fall back to ${promised.join(' or ')}, per src/tokens/contract.js`);
      }
    }
  }
}

/**
 * token-assignment. A library stylesheet that assigns a site component token.
 *
 * A component token is the site's word on a component. A rule inside the library that
 * writes to it — `.ds-grid--cell-md { --ds-grid-min: 20rem }` — overwrites whatever the
 * site put in theme.css, and only for that variant, which is the kind of half-working
 * override nobody reports as a bug. The library reads component tokens; a modifier that
 * needs a default of its own assigns a private `--_name` and reads the component token
 * into it.
 */
export function componentTokenAssignments(css) {
  return COMPONENT_TOKEN_NAMES.filter((name) => new RegExp(`(?:^|[;{])\\s*--ds-${name}\\s*:`, 'm').test(css));
}

function checkComponentTokenAssignment(files) {
  for (const file of files) {
    for (const name of componentTokenAssignments(read(file))) {
      fail('token-assignment', label(file), `assigns --ds-${name}, which belongs to the site — read it into a --_ variable instead`);
    }
  }
}

/**
 * The boundary check is intentionally narrow: it reads literal `.ds-*` class
 * selectors and compares their BEM roots with classes emitted by the owning source.
 * It is not a CSS parser and makes no claim about tag, attribute or site classes.
 */
export function foreignComponentClasses(source, css) {
  const roots = new Set(
    [...source.matchAll(/\bds-[a-z0-9-]+/g)]
      .map(([name]) => name.split(/__|--/)[0]),
  );
  const selected = [...stripCssComments(css).matchAll(/\.(ds-[a-z0-9_-]+)/gi)].map(([, name]) => name);

  return [...new Set(selected.filter((name) =>
    ![...roots].some((root) => name === root || name.startsWith(`${root}__`) || name.startsWith(`${root}--`)),
  ))].sort();
}

function checkComponentBoundaries() {
  const owners = [
    ...TIER_NAMES.flatMap((tier) => componentsIn(tier)
      .filter(({ stylesheet }) => stylesheet)
      .map(({ source, stylesheet }) => ({ source, stylesheets: [stylesheet] }))),
  ];

  for (const owner of owners) {
    const source = read(owner.source);

    for (const stylesheet of owner.stylesheets) {
      for (const name of foreignComponentClasses(source, read(stylesheet))) {
        fail(
          'component-boundary',
          label(stylesheet),
          `selects .${name}, which its renderer does not own — add an owner wrapper or a documented composition hook`,
        );
      }
    }
  }
}

/**
 * layer. Cascade layers are the build's business, not an author's.
 *
 * A stylesheet that declares its own layer would land inside the one the build wraps
 * it in, and the resulting order is nobody's intention.
 */
function checkLayering(files) {
  for (const file of files) {
    if (/@layer\b/.test(read(file))) {
      fail('layer', label(file), 'declares @layer — the build assigns layers, see src/tokens/contract.js');
    }
  }
}

/**
 * tap-target. The floor.
 *
 * WCAG 2.2 §2.5.8 Target Size (Minimum) asks for 24 CSS pixels. The system ships 44,
 * the Apple HIG figure; this only refuses a site that drops below the standard.
 */
function checkTapTarget(primitivesPath) {
  const declared = read(primitivesPath).match(/--ds-tap-target\s*:\s*([\d.]+)px/);

  if (!declared) {
    fail('tap-target', label(primitivesPath), '--ds-tap-target is not declared in pixels');
    return;
  }

  if (Number(declared[1]) < MIN_TAP_TARGET_PX) {
    fail(
      'tap-target',
      label(primitivesPath),
      `--ds-tap-target is ${declared[1]}px, under the WCAG 2.2 §2.5.8 minimum of ${MIN_TAP_TARGET_PX}px`,
    );
  }
}

/**
 * focus-visible, the other half. Every site inherits one focus ring from the base
 * sheet, so the ring existing at all is checked once, here, rather than being a thing
 * each component is trusted to remember.
 */
function checkFocusRing(basePath) {
  const css = read(basePath);
  const ring = css.match(/:focus-visible\s*\{[^}]*\}/);

  if (!ring || !/outline\s*:/.test(ring[0])) {
    fail(
      'focus-visible',
      label(basePath),
      'no global :focus-visible outline — every focusable element would be invisible to a keyboard',
    );
  }
}

/* --- run ---------------------------------------------------------------------- */

/**
 * What the last `lint()` could not check, so the CLI can say so out loud. Emptied
 * rather than replaced, so a module that imported it is still looking at the live one.
 */
export const skipped = [];

export function lint(siteRoot, { dist = join(siteRoot, 'dist'), site } = {}) {
  const failures = [];
  const previous = collecting;

  collecting = failures;
  skipped.length = 0;

  try {
    run(siteRoot, dist);
    checkOgImage(siteRoot, site, dist);
  } finally {
    collecting = previous;
  }

  return failures;
}

function checkOgImage(root, site, dist) {
  const path = site?.ogImage?.path;
  if (!path || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(path)) return;
  const base = new URL(site.url || 'https://site.invalid/');
  const image = new URL(path, base);
  const pathname = image.pathname.startsWith(base.pathname)
    ? image.pathname.slice(base.pathname.length) : image.pathname.replace(/^\//, '');
  let localPath;
  try { localPath = decodeURIComponent(pathname); }
  catch {
    fail('og-image', 'site.config.js', `ogImage.path "${path}" has invalid URL encoding`);
    return;
  }
  if (!statSync(join(root, localPath), { throwIfNoEntry: false })?.isFile()) {
    fail('og-image', 'site.config.js', `ogImage.path "${path}" does not name a local image file`);
  }
  if (existsSync(dist) && !statSync(join(dist, localPath), { throwIfNoEntry: false })?.isFile()) {
    fail('og-image', 'site.config.js', `ogImage.path "${path}" is missing from build output "${dist}"; put the image under assets/ and rebuild`);
  }
}

function run(siteRoot, dist) {
  const primitives = join(LIB, 'src/tokens/primitives.css');
  /*
   * A site with no palette at all is a lint failure and not a crash: theme.css is the
   * one file a site has to supply, and reporting that through the rule that owns it
   * says so in the same sentence the other theme problems are reported in.
   */
  const themes = siteThemes(siteRoot);

  if (!themes.length) {
    fail(
      'theme-contract',
      label(join(siteRoot, BASE_THEME.file)),
      `a site has to declare its own colors — there is no ${BASE_THEME.file} here`,
    );
  }

  /*
   * Everything in src/tokens/ and every palette the site declares is where color and raw
   * values are allowed to be written, so the directories are the list: a palette added
   * to either is exempt by living there rather than by being remembered here.
   */
  const sitePalettes = themes.map((theme) => theme.path);
  const themeFiles = [...filesBelow(join(LIB, 'src/tokens'), '.css'), ...sitePalettes];

  const libraryStyles = Object.values(librarySheets()).flat();
  const blockStyles = filesBelow(join(siteRoot, 'blocks'), '.css');

  checkStyles([...libraryStyles, ...blockStyles, ...themeFiles], { themeFiles, libraryFiles: libraryStyles });
  checkScripts([...filesBelow(join(LIB, 'src/runtime'), '.js'), ...filesBelow(join(siteRoot, 'blocks'), '.js')]);

  if (themes.length) {
    checkThemes(themes);
  }

  checkSiteTokens([...blockStyles, ...sitePalettes]);

  checkCopy(filesBelow(join(siteRoot, 'content'), '.js'));

  if (!checkBuild(dist)) {
    skipped.push('no-js-content and assets — there is no dist/ to read; build first to check the output');
  }

  // A page and its content, but not blocks/ — that is where site markup belongs.
  checkSiteCode(
    [join(siteRoot, 'pages.js'), join(siteRoot, 'site.config.js'), ...filesBelow(join(siteRoot, 'content'), '.js')].filter(
      (path) => existsSync(path),
    ),
  );

  checkComponentTokens(libraryStyles);
  checkComponentTokenAssignment(libraryStyles);
  checkComponentBoundaries();
  checkLayering([...libraryStyles, ...blockStyles, ...themeFiles]);
  checkTapTarget(primitives);
  checkFocusRing(join(LIB, 'src/styles/base.css'));
}

if (isMain(import.meta.url)) {
  const { explicit, rest } = takeSitesFlag(process.argv.slice(2));
  const target = rest[0] ?? '.';
  const root = locate(target, knownSites(explicit))?.path ?? resolve(target);
  const { site } = await import(pathToFileURL(join(root, 'site.config.js')).href);
  const results = lint(root, { site });

  for (const { rule, where, detail } of results) {
    console.error(`${rule}  ${where}\n        ${RULES[rule].summary} — ${detail}`);
  }

  // A rule nothing could read is not a rule that passed, so it is said rather than assumed.
  for (const note of skipped) {
    console.error(`skipped  ${note}`);
  }

  console.log(results.length ? `\n${results.length} problems` : 'clean');
  process.exit(results.length ? 1 : 0);
}
