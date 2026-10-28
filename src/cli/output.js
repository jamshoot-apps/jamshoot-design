import { lstatSync } from 'node:fs';
import { lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { containsPath, physicalPath } from './files.js';
import { acquireBuildLock, buildLockPath } from './build-lock.js';

const builds = new Map();
const MARKER = '.jamshoot-build';

export function outputDestination(out, { root, sources }) {
  const absolute = resolve(out);
  // Keep the leaf unresolved so lstat rejects an output symlink rather than its target,
  // but take an existing directory's on-disk letter case so a case alias is still compared.
  let destination = join(physicalPath(dirname(absolute)), basename(absolute));
  if (!lstatSync(destination, { throwIfNoEntry: false })?.isSymbolicLink()) destination = physicalPath(destination);
  const sourceRoot = physicalPath(resolve(root));
  const protectedPaths = sources.map((path) => physicalPath(resolve(path)));
  if (containsPath(destination, sourceRoot) || protectedPaths.some((path) =>
    containsPath(path, destination) || containsPath(destination, path))) {
    throw new Error('build output must be a dedicated directory outside the site source directories');
  }
  return destination;
}

/** Replace only owned output, after a complete generation succeeds. */
export async function replaceOutput(out, options, generate) {
  const { owner } = options;
  const destination = outputDestination(out, options);
  // Keyed like the lock, so calls that differ only in letter case queue instead of colliding.
  const key = buildLockPath(destination);
  const previous = builds.get(key) ?? Promise.resolve();
  const current = previous.catch(() => {}).then(async () => {
    await mkdir(dirname(destination), { recursive: true });
    const release = await acquireBuildLock(destination);
    try {
      let info;
      try { info = await lstat(destination); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (info) {
        let owned = false;
        if (info.isDirectory()) {
          if (!(await readdir(destination)).length) owned = true;
          else {
            try { owned = await readFile(join(destination, MARKER), 'utf8') === owner; }
            catch (error) { if (error.code !== 'ENOENT') throw error; }
          }
        }
        if (!owned) throw new Error(`build output "${out}" is not an empty or JamShoot-owned directory; move it aside before building`);
      }
      const workspace = await mkdtemp(join(dirname(destination), `.${basename(destination)}-build-`));
      const staging = join(workspace, 'next');
      const backup = join(workspace, 'previous');
      let backedUp = false;
      try {
        await mkdir(staging);
        const result = await generate(staging);
        await writeFile(join(staging, MARKER), owner);
        try {
          await rename(destination, backup);
          backedUp = true;
        } catch (error) { if (error.code !== 'ENOENT') throw error; }
        try { await rename(staging, destination); }
        catch (error) {
          if (backedUp) {
            await rename(backup, destination);
            backedUp = false;
          }
          throw error;
        }
        backedUp = false;
        return result;
      } finally {
        // Retain the last generation if rollback itself failed.
        if (!backedUp) await rm(workspace, { recursive: true, force: true });
      }
    } finally { await release(); }
  });
  builds.set(key, current);
  try { return await current; }
  finally { if (builds.get(key) === current) builds.delete(key); }
}
