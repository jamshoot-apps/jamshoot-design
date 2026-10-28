#!/usr/bin/env node
/**
 * Render a 1200×630 share image using library tokens, the site palette and logo,
 * and site-owned fonts or the system stack. Chromium rasterizes the standalone HTML;
 * --html writes a preview without a browser. Geometric patterns need no icon set;
 * scatter draws SVG icons, built-in or from JAMSHOOT_ICONS_DIR.
 *
 * Usage, flags and platform requirements: docs/authoring.md, Open Graph images.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { parseArgs as parseCliArgs } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { escape, h } from '../html.js';
import { iconNames } from '../icons.js';
import { fontCss } from './build.mjs';
import { parseColour, over, contrast } from './colours.js';
import { SURFACE_ROLES } from '../tokens/contract.js';
import { DEFAULT_SCATTER_ICONS, PATTERNS, patternDataUri } from './og-patterns.js';
import { isMain, knownSites, locate, suggest, takeSitesFlag } from './sites.js';

const LIB = fileURLToPath(new URL('../../', import.meta.url));

const WIDTH = 1200;
const HEIGHT = 630;
const INK_VALUES = ['light', 'dark'];
const MIN_CONTRAST = 4.5; // WCAG 2.2 §1.4.3 — the same floor the theme-contract lint holds every site's theme.css to.

/* Considered defaults for a fixed 1200×630 canvas — not on the responsive scale a
   live page reads, so they are named here once and left fully overridable from the
   CLI rather than baked in. */
const DEFAULT_ICON_SIZE = 220;
const DEFAULT_TITLE_SIZE = 78;
const DEFAULT_SUBTITLE_SIZE = 32;

/* ---- a Chromium-family browser, whichever is installed ------------------------- */

const CANDIDATES = [
  process.env.CHROME,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
].filter(Boolean);

const exists = (path) => stat(path).then(() => true, () => false);

async function findBrowser() {
  for (const candidate of CANDIDATES) {
    if (await exists(candidate)) return candidate;
  }

  throw new Error('no Chromium-family browser found. Install Chrome, or set CHROME to a binary.');
}

/* ---- images ---------------------------------------------------------------------- */

const MIME_TYPES = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml' };
const mimeFor = (path) => MIME_TYPES[path.split('.').pop().toLowerCase()] ?? 'application/octet-stream';
const dataUri = (buffer, mime) => `data:${mime};base64,${buffer.toString('base64')}`;

/** Width/height straight out of the IHDR chunk — enough to catch a non-square icon, no decoder needed. */
function pngSize(buffer) {
  if (buffer.length < 24 || buffer.readUInt32BE(0) !== 0x89504e47) {
    return null;
  }

  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

/* ---- source fingerprint -------------------------------------------------------------- */

/* Chromium's pixels differ between versions, operating systems and font rasterisers, so
   --check cannot compare bytes across machines. Each rendered PNG instead carries a tEXt
   chunk with a SHA-256 of the HTML it was rendered from, and --check compares that with
   the HTML it would render now, without launching a browser. */
const FINGERPRINT_KEYWORD = 'jamshoot-og-source';
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;

  for (let bit = 0; bit < 8; bit += 1) {
    c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }

  return c >>> 0;
});

/** CRC-32 as PNG defines it (ISO 3309), table-driven. */
export function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

/** Every chunk of a well-formed PNG (signature, IHDR first, IEND last, CRCs intact), or null. */
function pngChunks(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < PNG_SIGNATURE.length || !buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    return null;
  }

  const chunks = [];
  let offset = PNG_SIGNATURE.length;

  while (offset < buffer.length) {
    if (offset + 12 > buffer.length) return null;

    const length = buffer.readUInt32BE(offset);
    const end = offset + 12 + length;
    if (end > buffer.length) return null;

    // The CRC covers the type and the data, not the length field.
    const covered = buffer.subarray(offset + 4, end - 4);
    if (crc32(covered) !== buffer.readUInt32BE(end - 4)) return null;

    chunks.push({ type: covered.toString('latin1', 0, 4), data: covered.subarray(4), start: offset, end });
    offset = end;
  }

  const first = chunks[0]?.type;
  const last = chunks.at(-1)?.type;
  return first === 'IHDR' && last === 'IEND' ? chunks : null;
}

function pngChunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'latin1');

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);

  return Buffer.concat([head, data, crc]);
}

/** A tEXt chunk is a Latin-1 keyword, a NUL byte and the text. */
const isFingerprint = (chunk) => chunk.type === 'tEXt' && chunk.data.toString('latin1', 0, chunk.data.indexOf(0)) === FINGERPRINT_KEYWORD;

/* Bump whenever the Chrome flags, the canvas size or the stamping in render() change. Those change the
   pixels without changing the HTML, so an image rendered by the previous pipeline would still pass --check. */
export const RENDER_VERSION = 1;

/** What a render is a function of: the exact HTML handed to Chromium, the canvas size and the render pipeline's version. */
export function renderFingerprint(html) {
  return createHash('sha256').update(`${WIDTH}x${HEIGHT} render-${RENDER_VERSION}\n${html}`).digest('hex');
}

/** `png` with a fingerprint tEXt chunk straight after IHDR. An older fingerprint is replaced; every other byte is kept. */
export function withSourceFingerprint(png, fingerprint) {
  const chunks = pngChunks(png);
  if (!chunks) throw new Error('not a well-formed PNG');

  const [header, ...rest] = chunks;
  const stamp = pngChunk('tEXt', Buffer.from(`${FINGERPRINT_KEYWORD}\0${fingerprint}`, 'latin1'));

  return Buffer.concat([
    PNG_SIGNATURE,
    png.subarray(header.start, header.end),
    stamp,
    ...rest.filter((chunk) => !isFingerprint(chunk)).map((chunk) => png.subarray(chunk.start, chunk.end)),
  ]);
}

/** The fingerprint a PNG was stamped with, or null when it is malformed or was never stamped. */
export function sourceFingerprint(png) {
  const stamp = pngChunks(png)?.find(isFingerprint);
  if (!stamp) return null;

  return stamp.data.toString('latin1', stamp.data.indexOf(0) + 1);
}

/* ---- colour ------------------------------------------------------------------------ */

/* A generic contrast pair — not tied to any one site's theme, for the moment a custom
   background steps outside the twelve roles the theme.css contract already checks. */
const LIGHT_INK = { text: '#f6f6f5', textMuted: 'rgb(246 246 245 / 0.68)' };
const DARK_INK = { text: '#17181a', textMuted: 'rgb(23 24 26 / 0.68)' };

/** Every `--ds-<role>: value;` in a theme.css, keyed by role name without the prefix. */
function themeRoles(themeCss) {
  const roles = {};

  for (const [, name, value] of themeCss.matchAll(/--ds-([a-z-]+):\s*([^;]+);/g)) {
    roles[name] = value.trim();
  }

  return roles;
}

/** Contrast is measurable only against an opaque background. */
function contrastOf(bgValue, fgValue) {
  const bg = parseColour(bgValue);
  const fg = parseColour(fgValue);
  return bg && fg && bg[3] >= 1 ? contrast(over(fg, bg), bg) : null;
}

/** Whichever of the two generic ink pairs reads better against `bg` — ties go light, the more common case for a product's dark theme. */
function pickInk(bg, inkFlag) {
  if (inkFlag) {
    return inkFlag === 'light' ? LIGHT_INK : DARK_INK;
  }

  const lightRatio = contrastOf(bg, LIGHT_INK.text);
  const darkRatio = contrastOf(bg, DARK_INK.text);

  if (lightRatio === null || darkRatio === null) {
    console.log(
      `  Could not read "${bg}" as a hex or rgb() colour to pick contrasting text automatically — assuming light text. Pass --ink dark if that reads wrong.`,
    );

    return LIGHT_INK;
  }

  return lightRatio >= darkRatio ? LIGHT_INK : DARK_INK;
}

/** The auto-lint: whatever `bg` turned out to be, verify what actually landed rather than trusting the pick. */
function warnIfLowContrast({ bg, text, textMuted }) {
  for (const [role, value] of [['text', text], ['text-muted', textMuted]]) {
    const ratio = contrastOf(bg, value);

    if (ratio !== null && ratio < MIN_CONTRAST) {
      console.log(`  ⚠ og-image: "${bg}" against --ds-${role} (${value}) is only ${ratio.toFixed(1)}:1 — WCAG AA wants ${MIN_CONTRAST}:1. Try a different --bg, or --ink.`);
    }
  }
}

/**
 * `bg` is either one of the theme's own surface roles — in which case the theme's own
 * `text`/`text-muted` already clear the contract's 4.5:1 against it — or an arbitrary
 * colour, in which case contrast is read off its luminance (or `--ink`, when that
 * can't be done reliably). Either way, the result is checked before it ships.
 */
function resolveColors(themeCss, bgFlag, inkFlag) {
  const roles = themeRoles(themeCss);
  const colors = SURFACE_ROLES.includes(bgFlag)
    ? { bg: roles[bgFlag], text: roles.text, textMuted: roles['text-muted'] }
    : { bg: bgFlag, ...pickInk(bgFlag, inkFlag) };

  warnIfLowContrast(colors);

  return colors;
}

/* ---- the card's own stylesheet ---------------------------------------------------- */

/** Site-owned fonts must resolve inside the temporary standalone OG document. */
async function inlineFonts(css, root) {
  let out = css;

  for (const [whole, file] of css.matchAll(/url\("\.\.\/(assets\/[^"\n]+)"\)/g)) {
    const buffer = await readFile(join(root, file));
    out = out.replace(whole, `url('${dataUri(buffer, 'font/woff2')}')`);
  }

  return out;
}

function cardCss({ iconSize, titleSize, subtitleSize }) {
  const iconRadius = Math.round(iconSize * 0.2237); // iOS's squircle ratio

  return `
html, body { width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; }

.og-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--ds-space-3xl);
  width: 100%;
  height: 100%;
  padding: 0 var(--ds-space-5xl);
  background: var(--ds-bg);
}

.og-card__pattern {
  position: absolute;
  inset: 0;
  opacity: 0.07;
  background-repeat: no-repeat;
  background-size: 100% 100%;
}

/* 'scatter' bakes its own per-glyph opacity into the SVG (icon shapes read differently
   than a flat dot or line at the same opacity, and need a quieter band behind the
   text), so the blanket opacity above would just dim it a second time. */
.og-card__pattern--scatter {
  opacity: 1;
}

.og-card__icon {
  position: relative;
  flex: none;
  width: ${iconSize}px;
  height: ${iconSize}px;
  object-fit: cover;
  /* The icon's radius follows this banner's icon size, not a 44px UI tile. */
  border-radius: ${iconRadius}px;
}

.og-card__text {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-sm);
  min-width: 0;
}

.og-card__title {
  /* The banner uses a fixed 1200×630 canvas, not the live page's responsive scale. */
  font-size: ${titleSize}px;
  font-weight: var(--ds-weight-bold);
  line-height: var(--ds-leading-tight);
  letter-spacing: var(--ds-tracking-tight);
  color: var(--ds-text);
  text-wrap: balance;
}

.og-card__subtitle {
  font-size: ${subtitleSize}px;
  font-weight: var(--ds-weight-regular);
  line-height: var(--ds-leading-snug);
  color: var(--ds-text-muted);
}
`;
}

/** Use the page's system stack or inline its configured local font files. */
async function buildCss(site, sizes, fonts) {
  const [reset, primitives, base, theme, faces] = await Promise.all([
    readFile(join(LIB, 'src/tokens/reset.css'), 'utf8'),
    readFile(join(LIB, 'src/tokens/primitives.css'), 'utf8'),
    readFile(join(LIB, 'src/styles/base.css'), 'utf8'),
    readFile(join(site.path, 'theme.css'), 'utf8'),
    inlineFonts(fontCss(fonts, site.path), site.path),
  ]);

  return [
    '@layer ds.reset, ds.primitives, ds.theme, ds.base, ds.card;',
    `@layer ds.reset { ${reset} }`,
    `@layer ds.primitives { ${primitives} }`,
    `@layer ds.theme { ${theme}\n${faces} }`,
    `@layer ds.base { ${base} }`,
    `@layer ds.card { ${cardCss(sizes)} }`,
  ].join('\n\n');
}

/* ---- the page ---------------------------------------------------------------------- */

function cardMarkup({ iconUri, pattern, colors, title, subtitle, iconSize, scatterIcons }) {
  const cardVars = `--ds-bg:${colors.bg};--ds-text:${colors.text};--ds-text-muted:${colors.textMuted}`;

  return h('body', {}, [
    h('div', { class: 'og-card', style: cardVars }, [
      pattern !== 'none' &&
        h('div', {
          class: ['og-card__pattern', pattern === 'scatter' && 'og-card__pattern--scatter'],
          style: `background-image: url('${patternDataUri(pattern, colors.text, { width: WIDTH, height: HEIGHT, iconSize, scatterIcons })}')`,
        }),
      h('img', { class: 'og-card__icon', src: iconUri, alt: '' }),
      h('div', { class: 'og-card__text' }, [
        h('p', { class: 'og-card__title', text: title }),
        subtitle && h('p', { class: 'og-card__subtitle', text: subtitle }),
      ]),
    ]),
  ]);
}

function pageHtml({ lang, css, iconUri, pattern, colors, title, subtitle, iconSize, scatterIcons }) {
  return `<!doctype html>
<html lang="${escape(lang)}">
<meta charset="utf-8">
<style>${css}</style>
${cardMarkup({ iconUri, pattern, colors, title, subtitle, iconSize, scatterIcons })}
`;
}

/* ---- render ------------------------------------------------------------------------ */

async function render(chrome, html, destination) {
  const work = await mkdtemp(join(tmpdir(), 'jamshoot-og-'));
  let png = null;

  try {
    const htmlPath = join(work, 'card.html');
    await writeFile(htmlPath, html);
    const shotPath = join(work, 'card.png');

    /* --force-device-scale-factor=1 because og:image is consumed at its declared size:
       a 2× file is only bytes the crawler has to download before it crops. */
    const shot = spawnSync(chrome, [
      '--headless',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--default-background-color=00000000',
      `--window-size=${WIDTH},${HEIGHT}`,
      `--screenshot=${shotPath}`,
      pathToFileURL(htmlPath).href,
    ], { stdio: 'pipe' });

    if (shot.error) throw shot.error;

    if (shot.status !== 0) {
      throw new Error(`${chrome} exited with ${shot.status}\n${shot.stderr}`);
    }

    // The work directory is new, so anything found here is this render's output, never an old image.
    png = await readFile(shotPath).catch(() => null);
  } finally {
    await rm(work, { recursive: true, force: true });
  }

  if (!png || !pngChunks(png)) {
    throw new Error(`${chrome} exited without writing a PNG, so ${destination} was not updated`);
  }

  // Stamp the new render, then swap it in: the destination is only ever the old image or a complete, stamped new one.
  const stamped = withSourceFingerprint(png, renderFingerprint(html));
  // Staged beside the destination because rename is atomic only within one filesystem, and tmpdir may be another.
  const staged = `${destination}.tmp-${process.pid}`;

  try {
    await writeFile(staged, stamped);
    await rename(staged, destination);
  } catch (error) {
    await rm(staged, { force: true });
    throw error;
  }
}

/* ---- CLI ----------------------------------------------------------------------------- */

const VALUE_FLAGS = [
  'pattern', 'icon', 'out', 'title', 'subtitle', 'html', 'chrome',
  'bg', 'ink', 'icon-size', 'title-size', 'subtitle-size', 'scatter-icons',
];
const BOOLEAN_FLAGS = ['check'];

function parseArgs(args) {
  const options = Object.fromEntries([
    ...VALUE_FLAGS.map((name) => [name, { type: 'string' }]),
    ...BOOLEAN_FLAGS.map((name) => [name, { type: 'boolean' }]),
  ]);
  const { values, positionals } = parseCliArgs({ args, options, allowPositionals: true });
  if (positionals.length > 1) throw new Error('Name one site per invocation.');
  return { flags: values, positional: positionals };
}

const withSuffix = (path, suffix) => path.replace(/(\.[^./]+)$/, `-${suffix}$1`);
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
const positiveInt = (value, fallback) => {
  if (value === undefined) return fallback;
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n <= 0) throw new Error(`Expected a positive integer size, got "${value}".`);
  return n;
};

function cardOptions(flags) {
  const pattern = flags.pattern ?? 'dots';
  if (pattern !== 'all' && !PATTERNS.includes(pattern)) throw new Error(`--pattern must be one of ${PATTERNS.join(', ')} or all (got "${pattern}").`);
  if (flags.ink && !INK_VALUES.includes(flags.ink)) throw new Error(`--ink must be one of ${INK_VALUES.join(', ')} (got "${flags.ink}").`);
  const singleOutput = ['out', 'check', 'html'].find((name) => flags[name]);
  if (pattern === 'all' && singleOutput) throw new Error(`--${singleOutput} requires a single --pattern, not "all".`);
  if (flags.html && flags.check) throw new Error('--html and --check cannot be combined.');
  const scatterIcons = flags['scatter-icons']?.split(',').map((name) => name.trim()) ?? DEFAULT_SCATTER_ICONS;
  // Geometric patterns draw no icons.
  if (pattern === 'scatter' || pattern === 'all') {
    const unknown = scatterIcons.find((name) => !iconNames().includes(name));
    if (unknown) throw new Error(`--scatter-icons: "${unknown}" is not a built-in icon or in JAMSHOOT_ICONS_DIR. Set JAMSHOOT_ICONS_DIR to a directory that has it, or pass other names.`);
  }
  return {
    pattern, scatterIcons,
    sizes: {
      iconSize: positiveInt(flags['icon-size'], DEFAULT_ICON_SIZE),
      titleSize: positiveInt(flags['title-size'], DEFAULT_TITLE_SIZE),
      subtitleSize: positiveInt(flags['subtitle-size'], DEFAULT_SUBTITLE_SIZE),
    },
  };
}

async function loadCard(site, flags, { scatterIcons, sizes }) {
  const { site: config } = await import(pathToFileURL(join(site.path, 'site.config.js')).href);
  const icon = flags.icon ?? config.brand?.logo;
  if (!icon) throw new Error('Provide --icon or site.config.js brand.logo for the share image.');
  const iconPath = resolve(site.path, icon);
  const iconBuffer = await readFile(iconPath);
  const size = pngSize(iconBuffer);
  if (size && size.width !== size.height) throw new Error(`${iconPath} is ${size.width}×${size.height} — the icon should be square.`);
  const title = flags.title ?? config.brand?.name ?? '';
  const subtitle = flags.subtitle ?? config.brand?.tagline ?? '';
  const theme = await readFile(join(site.path, 'theme.css'), 'utf8');
  const colors = resolveColors(theme, flags.bg ?? 'surface', flags.ink);
  const css = await buildCss(site, sizes, config.fonts);
  const iconUri = dataUri(iconBuffer, mimeFor(iconPath));
  const page = (pattern) => pageHtml({ lang: config.lang ?? 'en', css, iconUri, pattern, colors, title, subtitle, iconSize: sizes.iconSize, scatterIcons });
  return { config, iconPath, title, subtitle, page };
}

/* Only flags that change the card's pixels or where they land belong in the hint. --check, --chrome
   and --html change how the image is checked or produced, not what it contains. */
const CARD_FLAGS = VALUE_FLAGS.filter((name) => !['chrome', 'html'].includes(name));

/* A word a POSIX shell reads back unchanged: plain values stay bare, anything else is single-quoted, with each ' written as '\''. */
const shellWord = (value) => (/^[\w./,:=@%+-]+$/.test(value) ? value : `'${value.replaceAll("'", "'\\''")}'`);

/** The command that regenerates the image with the card flags this run was given. Relative to the working directory, so it works whether or not the site sits under a configured search root.
    A bare relative path gains `./` so it is never taken for a configured site name, and each flag is written `--name=value` so a value starting with `-` still parses. */
function regenerateCommand(site, flags) {
  const path = relative(process.cwd(), site.path) || '.';
  return [
    'npx --no-install jamshoot-og-image',
    shellWord(path.startsWith('.') || isAbsolute(path) ? path : `./${path}`),
    ...CARD_FLAGS.filter((name) => flags[name] !== undefined).map((name) => `--${name}=${shellWord(flags[name])}`),
  ].join(' ');
}

/* Pixels are not compared: they differ between browsers and platforms. --check asks whether the
   image was rendered from the HTML it would render now, which needs no browser at all. */
async function checkImage(html, site, target, regenerate) {
  const label = relative(site.path, target);
  if (!existsSync(target)) throw new Error(`${label} is missing — run: ${regenerate}`);

  const stamped = sourceFingerprint(await readFile(target));
  if (stamped === null) throw new Error(`${label} is stale: it has no source fingerprint (made by an older version, or by hand) — run: ${regenerate}`);
  if (stamped !== renderFingerprint(html)) throw new Error(`${label} is stale: the card has changed since it was rendered — run: ${regenerate}`);

  console.log(`[og-image] ${label} is current`);
}

async function writeImages(chrome, site, flags, pattern, card, defaultOut) {
  for (const one of pattern === 'all' ? PATTERNS : [pattern]) {
    const dest = resolve(site.path, flags.out ?? (pattern === 'all' ? withSuffix(defaultOut, one) : defaultOut));
    await mkdir(dirname(dest), { recursive: true });
    await render(chrome, card.page(one), dest);
    const { size } = await stat(dest);
    console.log(`  ${one.padEnd(8)} → ${relative(site.path, dest)} (${kb(size)})`);
  }
  console.log(`\n  ${WIDTH}×${HEIGHT}, from ${relative(site.path, card.iconPath)}. Title: "${card.title}"${card.subtitle ? ` / "${card.subtitle}"` : ' (no subtitle)'}.`);
  if (!card.config.ogImage) console.log(`  Point site.config.js's ogImage at it: { path, width: ${WIDTH}, height: ${HEIGHT} }.\n`);
}

async function main() {
  const { explicit, rest } = takeSitesFlag(process.argv.slice(2));
  const { flags, positional } = parseArgs(rest);
  const sites = knownSites(explicit);
  const site = locate(positional[0], sites);
  if (!site) throw new Error(`${positional[0] ? `"${positional[0]}" is not a site.` : 'Name a site.'}\n${suggest(sites, explicit)}`);
  const options = cardOptions(flags);
  const card = await loadCard(site, flags, options);
  if (flags.html) {
    await writeFile(flags.html, card.page(options.pattern));
    console.log(`[og-image] wrote ${flags.html} — open it at ${WIDTH}×${HEIGHT}`);
    return;
  }
  const defaultOut = card.config.ogImage?.path ?? 'assets/images/og-banner.png';
  const target = resolve(site.path, flags.out ?? defaultOut);
  if (flags.check) return checkImage(card.page(options.pattern), site, target, regenerateCommand(site, flags));
  const chrome = flags.chrome ?? await findBrowser();
  await writeImages(chrome, site, flags, options.pattern, card, defaultOut);
}

if (isMain(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error(`[og-image] ${error.message}`);
    process.exitCode = 1;
  }
}
