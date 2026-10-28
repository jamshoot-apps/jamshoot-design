/**
 * Documentation server. Builds the docs, serves them, rebuilds when a
 * doc page, a component, a stylesheet or a token changes.
 *
 *   npm run serve
 *   npm run serve -- --port 5000
 *
 * Same thing `scripts/docs.mjs` writes to `dist-docs`, with a server and a watcher around
 * it — so editing a component and editing its documentation are one loop, and a doc
 * page that describes something the library no longer does fails immediately instead
 * of quietly going stale.
 */

import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { builder, portArgument, runner } from '../src/cli/serve.js';

const LIB = fileURLToPath(new URL('../', import.meta.url));
const DOCS_BUILD = fileURLToPath(new URL('./docs.mjs', import.meta.url));

// The same `--port` rules as src/cli/dev.mjs, wherever the flag stands.
const { port } = portArgument(process.argv.slice(2), process.env.PORT ?? 4180);
const out = join(LIB, 'dist-docs');

await runner({
  label: 'jamshoot-design',
  root: out,
  port,
  build: builder(DOCS_BUILD, ['--out', out]),
  watching: [
    join(LIB, 'docs'),
    join(LIB, 'src'),
    join(LIB, 'scripts'),
  ],
});
