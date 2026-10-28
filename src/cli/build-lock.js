import { createHash, randomBytes } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { link, open, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir, uptime, userInfo } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

// Slack for the boot time computed from the uptime, so a lock written just after boot is not judged stale.
const BOOT_MARGIN_MS = 5000;
// Attempts to win a generation while others compete. Each attempt either takes the lock,
// reports it busy, or looks again after a competitor changed the listing.
const ATTEMPTS = 100;
const RELEASED = 'released';

/*
 * Mutual exclusion without compare-and-swap.
 *
 * The lock for a destination is a series of generation files, `<stem>.1`, `<stem>.2`, and so on.
 * Each is published by hard-linking a fully written staging file, so it appears with its content
 * or not at all, and a given name can be created by exactly one process. The holder is the
 * process whose file is the highest-numbered one.
 *
 * To take the lock, list the files. If the highest is live, the lock is busy. Otherwise publish
 * the next number, then list again, and hold only if the new file is still the highest; if not,
 * withdraw it and start over. The second listing is what makes removing superseded files safe.
 * A process working from an old listing can publish a number that superseded files have left
 * free below the highest, and only that check catches it.
 *
 * Why two holders cannot coexist: a holder's file was the highest when it passed the check, and
 * a higher file can only be published after the holder's file was judged free. A file is judged
 * free only when it is released, its pid is dead, or it predates the last boot, so a live holder
 * is never judged free. A lower file that loses the check never holds at all.
 *
 * The highest file is never removed by its owner. Release replaces it with a `released` marker,
 * so the highest number never disappears and numbering never restarts. Superseded files are
 * removed afterwards; they are never read again. A pid reused within one session can block a
 * build until the file is removed by hand; the error names that file.
 *
 * Assumptions: a listing is treated as a consistent snapshot, so a file created and another
 * removed during one listing of a very large temporary directory could in theory be missed. The
 * boot time comes from the wall clock, so a large forward clock step soon after boot can make a
 * live lock look stale. A staging `*.tmp` file left by a crash is never read and is not removed
 * automatically, because a live process may be about to link it.
 */

/**
 * The lock name for a build destination. It lives in the temporary directory, named from the
 * canonical destination and the user, so the site directory never gains a file of its own.
 * The result is the stem of the generation files, not a file that exists by itself.
 * The last component is lower-cased because it may not exist yet, so its on-disk letter case
 * cannot be read; on a case-sensitive disk, `dist` and `DIST` merely share a lock.
 */
export function buildLockPath(destination) {
  const absolute = resolve(destination);
  const key = join(canonicalPath(dirname(absolute)), basename(absolute).normalize('NFC').toLowerCase());
  const digest = createHash('sha256').update(key).digest('hex');
  return join(tmpdir(), `jamshoot-build-${owner()}-${digest.slice(0, 16)}.lock`);
}

/**
 * Takes the build lock for `destination`, or throws naming the process holding it.
 * The returned release function marks the lock released.
 */
export async function acquireBuildLock(destination) {
  const stem = buildLockPath(destination);

  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const generations = await listGenerations(stem);
    const last = generations.at(-1);
    let number = 1;

    if (last) {
      const lock = await inspect(last.path);
      // Superseded and removed since the listing: look again.
      if (!lock) continue;
      const holder = blockingHolder(lock);
      if (holder) throw busy(destination, holder, last.path);
      number = last.number + 1;
    }

    const path = `${stem}.${number}`;
    if (!(await publish(stem, path))) continue;

    const current = await listGenerations(stem);
    if (current.at(-1)?.number === number) {
      await supersede(current.filter((generation) => generation.number < number));
      return () => release(path);
    }
    // Beaten while publishing: a higher generation exists, so this one is withdrawn.
    await rm(path, { force: true });
  }

  throw busy(destination, null, `${stem}.<number>`);
}

function busy(destination, holder, path) {
  const who = holder?.pid ? `build process ${holder.pid}` : 'another build process';
  return new Error(`build output "${destination}" is locked by ${who} (lock file ${path}); retry when it finishes, or delete that file if no build is running`);
}

/** The owner's user id, so builds by different users on a shared temporary directory never collide. */
function owner() {
  return process.getuid?.() ?? userInfo().username.replace(/\W/g, '_');
}

/**
 * The on-disk spelling of a path: symlinks and letter case resolved for the existing part, with
 * any missing remainder appended as given. The first build of a destination has no directory yet.
 */
function canonicalPath(path) {
  try { return realpathSync.native(path); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return join(canonicalPath(dirname(path)), basename(path));
  }
}

async function listGenerations(stem) {
  const directory = dirname(stem);
  const prefix = `${basename(stem)}.`;
  const names = await readdir(directory);

  return names
    .filter((name) => name.startsWith(prefix) && /^[1-9]\d*$/.test(name.slice(prefix.length)))
    .map((name) => ({ number: Number(name.slice(prefix.length)), path: join(directory, name) }))
    .sort((a, b) => a.number - b.number);
}

/**
 * Creates `path` with this process's pid. The staging file is written in full first, then linked
 * into place, which fails if the name already exists. Returns false in that case.
 */
async function publish(stem, path) {
  const staging = `${stem}.${randomBytes(8).toString('hex')}.tmp`;
  await writeFile(staging, `${process.pid}\n`, { flag: 'wx' });
  try {
    await link(staging, path);
    return true;
  } catch (error) {
    if (error.code === 'EEXIST') return false;
    throw new Error(`cannot create build lock ${path}: ${error.message}; the build lock needs hard-link support in ${dirname(stem)}, so set TMPDIR to a local filesystem`, { cause: error });
  } finally {
    await rm(staging, { force: true });
  }
}

/** Removes files a newer generation has superseded. A file that cannot be removed does no harm. */
async function supersede(generations) {
  for (const generation of generations) {
    await rm(generation.path, { force: true }).catch(() => {});
  }
}

async function release(path) {
  const staging = `${path}.${randomBytes(8).toString('hex')}.tmp`;
  try {
    await writeFile(staging, `${RELEASED}\n`, { flag: 'wx' });
    await rename(staging, path);
  } catch (error) {
    await rm(staging, { force: true }).catch(() => {});
    throw new Error(`cannot release build lock ${path}: ${error.message}; delete it if no build is running`);
  }
}

/** The lock file's content and modification time, read from one open file, or null if it is gone. */
async function inspect(path) {
  let handle;
  try {
    handle = await open(path, 'r');
    const info = await handle.stat();
    const text = await handle.readFile('utf8');
    return { text, modified: info.mtimeMs };
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    if (error.code === 'EACCES' || error.code === 'EPERM') {
      throw new Error(`cannot read build lock ${path}: ${error.message}; delete it if no build is running`);
    }
    throw error;
  } finally {
    await handle?.close();
  }
}

/** The holder that still blocks a lock file, or null when the lock is free. */
function blockingHolder(lock) {
  const text = lock.text.trim();
  if (text === RELEASED) return null;
  // Not written by this design. Blocking keeps it from being overwritten; the error names it.
  if (!/^[1-9]\d*$/.test(text)) return { pid: null };
  // A file older than the last boot cannot belong to a live process, whatever its pid says now.
  if (lock.modified < Date.now() - uptime() * 1000 - BOOT_MARGIN_MS) return null;
  return alive(Number(text)) ? { pid: Number(text) } : null;
}

/** Whether a process with this pid exists. EPERM means it does, under another user. */
function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error.code === 'EPERM') return true;
    if (error.code === 'ESRCH') return false;
    throw error;
  }
}
