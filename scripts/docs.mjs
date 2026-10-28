/** Build the Markdown reference: node scripts/docs.mjs [--out dist-docs]. */
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDocs } from './docs/build.mjs';
import { isMain } from '../src/cli/sites.js';

// Keep helper imports used by the contract and documentation checks compatible.
export { inline } from './docs/markdown.mjs';
export { exampleBlocks, runExample } from './docs/examples.mjs';
export { pagesToBuild } from './docs/pages.mjs';

if (isMain(import.meta.url)) {
  const lib = fileURLToPath(new URL('../', import.meta.url));
  // Only the CLI supplies example icons; importing helpers leaves the caller alone.
  process.env.JAMSHOOT_ICONS_DIR ??= join(lib, 'docs/assets/icons');
  const outIndex = process.argv.indexOf('--out');
  const out = outIndex === -1 ? join(lib, 'dist-docs') : resolve(process.argv[outIndex + 1]);
  console.log(`built ${await buildDocs(out)} doc pages → ${out}`);
}
