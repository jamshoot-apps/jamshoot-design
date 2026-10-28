/**
 * The one recursive "every file below this directory with this extension" walker.
 *
 * `src/cli/build.mjs` (stylesheets, block scripts, its own `dist/` post-processing),
 * `scripts/tables.mjs` (`.md`) and two test files scanning `src/styles/` or `docs/` each carried
 * their own copy of this before it lived here — the same drift risk this library
 * exists to close off for CSS and components.
 *
 * Sorted by name at every level, so callers that concatenate or hash the result don't
 * depend on filesystem readdir order. A directory that does not exist is empty rather
 * than an error: a site with no `blocks/` is a site, not a failure.
 */

import { existsSync, readdirSync, realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, sep } from 'node:path';

/**
 * Resolve aliases in existing ancestors, including for an output that does not exist yet.
 * The native call also takes the on-disk letter case on case-insensitive disks.
 */
export function physicalPath(path) {
  try { return realpathSync.native(path); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return join(physicalPath(dirname(path)), basename(path));
  }
}

export function containsPath(parent, child) {
  const path = relative(parent, child);
  return !path || (!isAbsolute(path) && path !== '..' && !path.startsWith(`..${sep}`));
}

export function filesBelow(directory, extensions) {
  if (!existsSync(directory)) {
    return [];
  }

  const wanted = Array.isArray(extensions) ? extensions : [extensions];
  const entries = readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  const found = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      found.push(...filesBelow(path, wanted));
    } else if (wanted.some((extension) => entry.name.endsWith(extension))) {
      found.push(path);
    }
  }

  return found;
}
