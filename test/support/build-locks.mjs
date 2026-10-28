import { readdirSync, rmSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { buildLockPath } from '../../src/cli/build-lock.js';

/**
 * Removes every lock file of these build outputs from the temporary directory, so tests leave
 * no `released` markers behind. Call it before removing the outputs' parent directories.
 */
export function removeBuildLocks(...destinations) {
  for (const destination of destinations) {
    const stem = buildLockPath(destination);
    for (const name of readdirSync(dirname(stem))) {
      if (name.startsWith(`${basename(stem)}.`)) rmSync(join(dirname(stem), name), { force: true });
    }
  }
}
