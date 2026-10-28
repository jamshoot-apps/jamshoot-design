/**
 * Palettes: how a site's theme files become the CSS that switches between them.
 *
 * The whole mechanism is three sentences.
 *
 *   1. A palette is a file that sets custom properties on `:root`, which is what a
 *      theme file has always been — `theme.css` is the base, `themes/<name>.css` is
 *      another palette named by its file.
 *   2. The build re-emits each file's declarations under the selector that turns it
 *      on: the base at `:root`, a palette named after a colour scheme also inside the
 *      matching `prefers-color-scheme` query, and every palette under its own
 *      `[data-theme]` attribute.
 *   3. A palette only writes what differs from the base, because that is what the
 *      cascade already does with two rules on the same element.
 *
 * What that buys, and why it is worth a module: adding a theme is adding a file.
 * There is no list of themes in the library, none in `site.config.js`, none in
 * `src/tokens/contract.js`, and none in the browser — `src/runtime/theme.js` reads the states
 * out of the control's own markup. The only thing the contract fixes is the two
 * strings the CSS, the page head and the runtime have to agree on.
 *
 * The base palette is never re-emitted: a reader who picks it outright gets
 * `data-theme="default"`, which matches nothing here and so simply stops the
 * `prefers-color-scheme` rule from applying. The one block this file writes twice is
 * a palette that both follows the system and can be chosen by name — and it writes
 * it, so there is nothing to keep in step by hand.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  AUTO_CHOICE,
  BASE_THEME,
  COLOR_SCHEMES,
  SCHEME_ICONS,
  THEME_ATTRIBUTE,
  THEME_DIRECTORY,
  THEME_METADATA,
  THEME_METADATA_TOKENS,
  THEME_NAME,
} from './tokens/contract.js';

/** The declarations inside the file's `:root` block — the palette itself. */
const BLOCK = /:root\s*\{([^}]*)\}/;
const COMMENT = /\/\*[\s\S]*?\*\//g;

/**
 * The metadata declarations, whole lines. They are how a palette tells the build what
 * to call it, and the build answers by reading them here and not passing them on.
 */
const METADATA = new RegExp(`^[ \\t]*--ds-(?:${THEME_METADATA_TOKENS.join('|')})\\s*:[^;]*;[ \\t]*\\r?\\n?`, 'gm');
const declaration = (css, property) =>
  css.match(new RegExp(`(?:^|[;{])\\s*${property}\\s*:\\s*([^;}]+)`, 'm'))?.[1].trim() ?? null;

/** `--ds-theme-label: 'Warm paper'` → `Warm paper`. A CSS string is quoted; a name is not. */
const unquote = (value) => value?.replace(/^(['"])([\s\S]*)\1$/, '$2') ?? null;

const titleCase = (name) => name.slice(0, 1).toUpperCase() + name.slice(1).replaceAll('-', ' ');

/**
 * One palette file, read. `name` is what `data-theme` calls it, `body` is what the
 * build puts under a selector, and the rest is what the control needs to offer it.
 *
 * Being the base is a position — the file the site starts from — and not a name, so a
 * palette that calls itself `default` is a collision the lint reports rather than a
 * second base nothing distinguishes from the first.
 */
function readTheme(path, name, base = false) {
  const css = readFileSync(path, 'utf8').replace(COMMENT, '');
  const block = css.match(BLOCK);
  /*
   * Everything is read out of the `:root` block and nowhere else, because that block
   * is the only part of the file the build carries — a `color-scheme` or a label in a
   * second rule would be honoured here and then never ship. `stray` reports that file
   * rather than this function quietly making sense of it.
   */
  const declarations = block?.[1] ?? '';
  const scheme = declaration(declarations, 'color-scheme');
  const metadata = Object.fromEntries(
    Object.entries(THEME_METADATA).map(([key, { token }]) => [key, unquote(declaration(declarations, `--ds-${token}`))]),
  );

  return {
    name,
    path,
    /*
     * What ships, which is not quite what the file says: the metadata read just above
     * is dropped. It is a palette talking to the build, and a custom property nothing
     * in a browser reads has no business being sent to every reader — twice, for a
     * palette that is emitted under both a media query and its own attribute.
     */
    body: declarations.replace(METADATA, ''),
    scheme,
    /* Every `--ds-` name this file sets, for the lint to resolve against the base. */
    declared: new Map([...declarations.matchAll(/--ds-([\w-]+)\s*:\s*([^;]+);/g)].map(([, token, value]) => [token, value.trim()])),
    /*
     * Anything outside that block — a second rule, a media query, a stray selector.
     * The build carries the block and nothing else, so the lint reports the remainder
     * rather than letting a site write CSS that quietly never ships.
     */
    stray: css.replace(block?.[0] ?? '', '').trim(),
    base,
    label: metadata.label ?? titleCase(base ? (scheme ?? name) : name),
    icon: metadata.icon ?? SCHEME_ICONS[scheme] ?? AUTO_CHOICE.icon,
    /*
     * `auto` has two answers at most — the system asks for `light` or for `dark` — so
     * a palette answers one of them by being named after it. The base answers the
     * scheme it declares without being named anything, which is what makes the
     * ordinary two-palette site one file plus one file.
     */
    follows: base ? scheme : (COLOR_SCHEMES.includes(name) ? name : null),
  };
}

/**
 * Every palette a site declares, base first. The directory is the list, so the order
 * is the order the control cycles: the base, then the rest by file name.
 */
export function siteThemes(root) {
  const base = join(root, BASE_THEME.file);
  const directory = join(root, THEME_DIRECTORY);
  /* One flat directory, sorted, so the cycle order does not depend on the filesystem. */
  const alternates = existsSync(directory)
    ? readdirSync(directory).filter((file) => file.endsWith('.css')).sort()
    : [];

  return [
    ...(existsSync(base) ? [readTheme(base, BASE_THEME.name, true)] : []),
    ...alternates.map((file) => readTheme(join(directory, file), basename(file, '.css'))),
  ];
}

/**
 * The palettes the library itself ships, read the way a site reads its own: one is the
 * base and the rest are differences from it.
 *
 * The docs site is the only caller — every other site has a `theme.css` and uses
 * `siteThemes()` — and it exists so the docs read the directory rather than carrying a
 * list of the library's palettes that the library could change underneath them. Which
 * starter is the base is the one thing a caller states, because a base is a position
 * and something has to take it.
 */
export function starterThemes(base) {
  const directory = fileURLToPath(new URL(`./tokens/${THEME_DIRECTORY}/`, import.meta.url));
  const files = readdirSync(directory)
    .filter((file) => file.endsWith('.css'))
    .sort()
    .map((file) => [join(directory, file), basename(file, '.css')]);
  const chosen = files.find(([, name]) => name === base);

  if (!chosen) {
    throw new Error(`starterThemes(): there is no src/tokens/${THEME_DIRECTORY}/${base}.css to start from`);
  }

  return [
    readTheme(chosen[0], BASE_THEME.name, true),
    ...files.filter(([, name]) => name !== base).map(([path, name]) => readTheme(path, name)),
  ];
}

/**
 * The `ds.theme` layer: the palettes, each under the selector that switches it on.
 *
 * The base is the page. A palette that follows a scheme the base does not is the page
 * under that system preference, unless the reader has said otherwise — which is what
 * `:not([data-theme])` means, and why picking the base outright is an attribute value
 * that matches no rule. Every palette is also selectable by name.
 */
export function themeCss(themes) {
  const [base, ...alternates] = themes;
  const rule = (selector, theme) => `${selector} {${theme.body}}`;
  const parts = [rule(':root', base)];

  for (const theme of alternates) {
    /*
     * A file name is about to become part of a selector. The lint says this in a
     * friendlier sentence and points at the file, but the lint is a separate command:
     * a build that never ran it still cannot write a selector out of a file name.
     */
    if (!THEME_NAME.test(theme.name)) {
      throw new Error(`${theme.path}: "${theme.name}" cannot be a palette name — it has to match ${THEME_NAME}`);
    }

    if (theme.follows && theme.follows !== base.follows) {
      parts.push(
        `@media (prefers-color-scheme: ${theme.follows}) {\n` +
          `${rule(`:root:not([${THEME_ATTRIBUTE}])`, theme)}\n}`,
      );
    }

    parts.push(rule(`:root[${THEME_ATTRIBUTE}="${theme.name}"]`, theme));
  }

  return parts.join('\n\n');
}

/**
 * What the control offers, in cycle order: follow the system first, then every
 * palette. `themeToggle()` is handed this and knows nothing else about themes — a
 * choice with no name is the one that stores nothing and sets no attribute.
 */
export function themeChoices(themes, { auto }) {
  return [
    { palette: null, label: auto, icon: AUTO_CHOICE.icon },
    ...themes.map(({ name, label, icon }) => ({ palette: name, label, icon })),
  ];
}
