/**
 * Where external sites are. Shared by every runner so an explicit name or path means
 * the same thing to dev.mjs, build.mjs and lint.mjs.
 *
 * A site is any directory holding a `site.config.js` and a `pages.js`. Nothing
 * registers one; it is found by looking. What can be configured is *where* to look:
 *
 *   1. `--sites <dir>` on the command line, repeatable.
 *   2. `JAMSHOOT_SITES`, one or more directories separated by the platform's path
 *      separator.
 *   3. With neither, the current directory when it is itself a site.
 *
 * The library never scans ancestors or sibling repositories.
 */

import { existsSync, readdirSync, realpathSync } from 'node:fs';
import { basename, delimiter, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Whether this module is the program being run. Not `process.argv[1] === the file
 * URL`: installed as a dependency the library is reached through a symlink, Node
 * resolves `import.meta.url` to the real path and the naive comparison silently
 * fails — the CLI would exit 0 having done nothing.
 */
export function isMain(url) {
  const entry = process.argv[1];

  if (!entry) {
    return false;
  }

  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(url));
  } catch {
    return false;
  }
}

const isSite = (path) =>
  existsSync(join(path, 'site.config.js')) && existsSync(join(path, 'pages.js'));

const fromEnvironment = (environment) =>
  (environment.JAMSHOOT_SITES ?? '')
    .split(delimiter)
    .filter(Boolean)
    .map((path) => resolve(path));

/** The directories that hold sites, in the order they will be searched. */
function siteRoots(explicit = [], environment = process.env) {
  return [...explicit.map((path) => resolve(path)), ...fromEnvironment(environment)];
}

/**
 * Every site the runners can name. A name collision across roots resolves to the
 * first root, which is why the explicit ones come first.
 */
export function knownSites(explicit = [], { cwd = process.cwd(), environment = process.env } = {}) {
  const roots = siteRoots(explicit, environment);
  const current = resolve(cwd);

  if (!roots.length && isSite(current)) {
    return [{ name: basename(current), path: current }];
  }

  const sites = [];
  const seen = new Set();

  for (const root of roots) {
    if (!existsSync(root)) {
      continue;
    }

    for (const entry of readdirSync(root, { withFileTypes: true })) {
      const path = join(root, entry.name);

      if (entry.isDirectory() && !seen.has(entry.name) && isSite(path)) {
        seen.add(entry.name);
        sites.push({ name: entry.name, path });
      }
    }
  }

  return sites;
}

/**
 * A name, a path, or nothing. Resolved in that order: a name is what you type day to
 * day, a path is the escape hatch for a site that lives somewhere unusual, and with
 * neither there had better be exactly one site.
 */
export function locate(argument, sites) {
  if (!argument) {
    return sites.length === 1 ? sites[0] : null;
  }

  const named = sites.find((site) => site.name === argument);

  if (named) {
    return named;
  }

  const path = resolve(argument);

  return isSite(path) ? { name: basename(path), path } : null;
}

/**
 * Pulls `--sites <dir>` (repeatable) out of an argument list. Returns the roots and
 * the arguments with those pairs removed, so a caller's own parsing never sees them.
 */
export function takeSitesFlag(args) {
  const explicit = [];
  const rest = [];

  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--sites') {
      explicit.push(args[index + 1] ?? '');
      index += 1;
    } else if (args[index].startsWith('--sites=')) {
      explicit.push(args[index].slice('--sites='.length));
    } else {
      rest.push(args[index]);
    }
  }

  return { explicit: explicit.filter(Boolean), rest };
}

/** What to print when a site could not be resolved. */
export function suggest(sites, explicit = [], environment = process.env) {
  if (sites.length) {
    return `  Available:\n${sites.map((site) => `    ${site.name}`).join('\n')}\n`;
  }

  const roots = siteRoots(explicit, environment);

  return roots.length
    ? `  No site under:\n${roots.map((root) => `    ${root}`).join('\n')}\n`
    : '  Run inside a site, pass its path, use --sites <dir>, or set JAMSHOOT_SITES.\n';
}
