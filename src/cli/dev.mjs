#!/usr/bin/env node
/**
 * Site runner. Builds a site, serves it, rebuilds on change.
 *
 *   node src/cli/dev.mjs              the current directory, when it is a site
 *   node src/cli/dev.mjs example --sites ../sites
 *   node src/cli/dev.mjs ../some/dir  by path, for a site that lives somewhere else
 *   node src/cli/dev.mjs --list       what it can find
 *   node src/cli/dev.mjs ../some/dir --port 5000
 *
 * A site is any directory holding `site.config.js` and `pages.js`. Nothing registers
 * one; discovery uses only explicit roots or the current site — see src/cli/sites.js.
 */

import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BASE_THEME, THEME_DIRECTORY } from '../tokens/contract.js';
import { builder, portArgument, runner } from './serve.js';
import { knownSites, locate, suggest, takeSitesFlag } from './sites.js';

const LIB = fileURLToPath(new URL('../../', import.meta.url));
const BUILD = fileURLToPath(new URL('./build.mjs', import.meta.url));

const { explicit, rest: sitesRest } = takeSitesFlag(process.argv.slice(2));
// `--port 5000` and `--port=5000` are the same flag, wherever it stands; its value is
// never a site name. Invalid values are rejected by runner().
const { port, rest: args } = portArgument(sitesRest, process.env.PORT ?? 4173);
// The first remaining argument that is not a flag is the site.
const target = args.find((argument) => !argument.startsWith('--'));
const sites = knownSites(explicit);

if (args.includes('--list')) {
  console.log(sites.length ? sites.map((site) => `  ${site.name}`).join('\n') : suggest(sites, explicit));
  process.exit(0);
}

const site = locate(target, sites);

if (!site) {
  console.error(
    target
      ? `\n  "${target}" is not a site — it needs a site.config.js and a pages.js.\n`
      : '\n  Name a site.\n',
  );
  console.error(suggest(sites, explicit));
  process.exit(1);
}

await runner({
  label: site.name,
  root: join(site.path, 'dist'),
  port,
  build: builder(BUILD, [site.path]),
  watching: [
    join(site.path, 'content'),
    join(site.path, 'blocks'),
    join(site.path, 'assets'),
    join(site.path, 'site.config.js'),
    join(site.path, 'pages.js'),
    join(site.path, BASE_THEME.file),
    join(site.path, THEME_DIRECTORY),
    join(LIB, 'src'),
  ],
});
