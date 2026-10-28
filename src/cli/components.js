/**
 * The four groups a component can belong to, and everything that follows from
 * belonging to one.
 *
 * The cascade layers in `build.mjs`, the section titles in `llms.mjs` and the docs
 * navigation in `docs.mjs` all read the tiers from this object, so they cannot
 * disagree, and a fifth group is one entry here and a directory beside its siblings.
 *
 * `src/index.js` is what binds a public name to a component. Keeping that one
 * static line explicit is cheaper than generating a barrel; discovery owns the
 * stylesheet and documentation paths around it.
 */

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LIB = fileURLToPath(new URL('../../', import.meta.url));

/**
 * In reading order, smallest first. `title` heads the tier's section in `llms.txt`
 * and in the docs navigation; `layer` is the cascade layer its stylesheets are
 * wrapped in — arrangement loses to the things being arranged.
 */
export const TIERS = {
  layout: { title: 'Layout', layer: 'ds.layout' },
  atoms: { title: 'Atoms', layer: 'ds.components' },
  molecules: { title: 'Molecules', layer: 'ds.components' },
  organisms: { title: 'Organisms', layer: 'ds.components' },
};

/** Just the names, in that order — the common case. */
export const TIER_NAMES = Object.keys(TIERS);

/**
 * Component folders declared under `src/components/<tier>/`, sorted. A folder owns
 * `<name>.js`, optional `<name>.css`, `README.md`, and any focused `*.test.mjs`.
 * Shared helpers stay in `src/` proper.
 */
export function componentsIn(tier) {
  return readdirSync(join(LIB, 'src/components', tier), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const directory = join(LIB, 'src/components', tier, entry.name);
      const stylesheet = join(directory, `${entry.name}.css`);

      return {
        tier,
        name: entry.name,
        directory,
        source: join(directory, `${entry.name}.js`),
        docs: join(directory, 'README.md'),
        stylesheet: existsSync(stylesheet) ? stylesheet : null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export const namesIn = (tier) => componentsIn(tier).map(({ name }) => name);
