import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LAYERS } from '../tokens/contract.js';
import { themeCss } from '../themes.js';
import { TIER_NAMES, TIERS } from './components.js';
import { filesBelow } from './files.js';

const LIB = fileURLToPath(new URL('../../', import.meta.url));

/*
 * Which cascade layer a stylesheet lands in is decided by where it lives, and by
 * nothing else. A directory here, a file there — so adding a component means adding
 * `src/components/molecules/thing/thing.css` and no second list to remember. The four component
 * directories are not listed here either: they are the tiers, and which layer each
 * one lands in is declared once, in `components.js`.
 *
 * The order inside a layer decides nothing: `src/tokens/contract.js` declares the layer
 * order, a later layer wins whatever the selectors look like, and no two files in the
 * library share a selector (`test/contracts/styles.test.mjs` checks that). Files inside a
 * directory are therefore taken in sorted order, which only has to be stable.
 */
export const LAYER_SOURCES = [
  ['ds.reset', 'src/tokens/reset.css'],
  ['ds.primitives', 'src/tokens/primitives.css'],
  ['ds.base', 'src/styles/base.css'],
  ...TIER_NAMES.map((tier) => [TIERS[tier].layer, `src/components/${tier}/`]),
];

/**
 * Expands `LAYER_SOURCES` into `{ layer: [absolute paths] }`. A trailing slash means
 * "every stylesheet in this directory"; anything else is a single file.
 */
export function librarySheets() {
  const sheets = {};

  for (const [layer, source] of LAYER_SOURCES) {
    const paths = source.endsWith('/')
      ? filesBelow(join(LIB, source), '.css')
      : [join(LIB, source)];

    sheets[layer] = [...(sheets[layer] ?? []), ...paths];
  }

  return sheets;
}

/** Assemble library, theme and block CSS in the declared cascade order. */
export async function stylesheet(themes, blocks = []) {
  const sources = { ...librarySheets(), 'ds.theme': themeCss(themes), 'site.blocks': blocks };
  const parts = [`@layer ${LAYERS.join(', ')};`];

  for (const name of LAYERS) {
    const source = sources[name] ?? [];
    const css = typeof source === 'string'
      ? source
      : (await Promise.all(source.map((path) => readFile(path, 'utf8')))).join('\n');
    if (css.trim()) parts.push(`@layer ${name} {\n${css}\n}`);
  }

  return parts.join('\n\n');
}
