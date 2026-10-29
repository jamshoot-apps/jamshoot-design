import assert from 'node:assert/strict';
import { fork, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir, uptime } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { test } from 'node:test';
import { acquireBuildLock, buildLockPath } from '../../src/cli/build-lock.js';
import { removeBuildLocks } from '../support/build-locks.mjs';

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'ds-build-lock-'));
  const destination = join(directory, 'dist');
  t.after(async () => {
    removeBuildLocks(destination);
    await rm(directory, { recursive: true, force: true });
  });
  return { directory, destination };
}

/** Every file of a destination's lock, by its generation number, lowest first. */
async function generations(destination) {
  const stem = buildLockPath(destination);
  const prefix = `${basename(stem)}.`;
  return (await readdir(dirname(stem)))
    .filter((name) => name.startsWith(prefix) && /^\d+$/.test(name.slice(prefix.length)))
    .map((name) => ({ number: Number(name.slice(prefix.length)), path: join(dirname(stem), name) }))
    .sort((a, b) => a.number - b.number);
}

/**
 * Starts `count` processes that each take the lock once, retrying while it is busy, and hold it
 * for 10 ms while creating an exclusive marker. Returns how often the marker already existed.
 */
async function contend(destination, marker, count) {
  const children = Array.from({ length: count }, () => fork(
    new URL('../support/contend-build-lock.mjs', import.meta.url),
    [destination, marker, '10', '20000'],
    { stdio: ['ignore', 'ignore', 'inherit', 'ipc'] },
  ));
  const exits = children.map((child) => once(child, 'exit'));

  try {
    await Promise.all(children.map(async (child) => {
      const [message] = await once(child, 'message');
      assert.equal(message, 'ready');
    }));
    for (const child of children) child.send('go');

    const results = await Promise.all(children.map(async (child) => (await once(child, 'message'))[0]));
    const failures = results.filter((result) => result.error);
    assert.deepEqual(failures, [], 'every process acquires the lock within the deadline');
    assert.equal(results.length, count);
    return results.reduce((total, result) => total + result.overlaps, 0);
  } finally {
    for (const child of children) {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    }
    await Promise.all(exits);
  }
}

test('the build lock is a generation file in the temporary directory, marked released on release', async (t) => {
  const { directory, destination } = await fixture(t);
  const stem = buildLockPath(destination);
  assert.equal(dirname(stem), tmpdir());
  assert.match(basename(stem), /^jamshoot-build-[^-]+-[0-9a-f]{16}\.lock$/);
  if (process.getuid) {
    assert.ok(basename(stem).includes(`-${process.getuid()}-`), 'the name carries the user id');
  }

  const release = await acquireBuildLock(destination);
  assert.deepEqual((await generations(destination)).map((generation) => generation.path), [`${stem}.1`]);
  assert.equal(await readFile(`${stem}.1`, 'utf8'), `${process.pid}\n`);
  assert.deepEqual(await readdir(directory), [], 'the site directory gains no lock file');

  await release();
  assert.equal(await readFile(`${stem}.1`, 'utf8'), 'released\n');
  const again = await acquireBuildLock(destination);
  await again();
  assert.deepEqual((await generations(destination)).map((generation) => generation.number), [2]);
});

test('a second acquire for the same destination fails and names the destination, holder and lock file', async (t) => {
  const { destination } = await fixture(t);
  const release = await acquireBuildLock(destination);
  const [{ path }] = await generations(destination);

  await assert.rejects(acquireBuildLock(destination), (error) => {
    assert.match(error.message, /is locked by build process/);
    assert.ok(error.message.includes(destination), 'the message names the destination');
    assert.ok(error.message.includes(String(process.pid)), 'the message names the holding pid');
    assert.ok(error.message.includes(path), 'the message names the lock file for manual removal');
    return true;
  });

  await release();
  const again = await acquireBuildLock(destination);
  await again();
});

test('a lock left by an exited process is superseded, and the superseded file removed', async (t) => {
  const { destination } = await fixture(t);
  const stem = buildLockPath(destination);
  // spawnSync has reaped this child, so its pid no longer belongs to any process.
  const { pid } = spawnSync(process.execPath, ['--version']);

  await writeFile(`${stem}.1`, `${pid}\n`);
  const release = await acquireBuildLock(destination);
  assert.deepEqual((await generations(destination)).map((generation) => generation.number), [2]);
  assert.equal(await readFile(`${stem}.2`, 'utf8'), `${process.pid}\n`);
  await release();
  assert.equal(await readFile(`${stem}.2`, 'utf8'), 'released\n');
});

test('an unrecognized lock file blocks and is named, never overwritten', async (t) => {
  const { destination } = await fixture(t);
  const stem = buildLockPath(destination);
  await writeFile(`${stem}.1`, 'partial');

  await assert.rejects(acquireBuildLock(destination), (error) => {
    assert.match(error.message, /is locked by another build process/);
    assert.ok(error.message.includes(`${stem}.1`));
    return true;
  });
  assert.equal(await readFile(`${stem}.1`, 'utf8'), 'partial');
});

test('a lock written before the last boot is reclaimed even when its pid is alive', async (t) => {
  const { destination } = await fixture(t);
  const stem = buildLockPath(destination);
  // The parent of this test process is alive, so only the boot time can make the lock stale.
  await writeFile(`${stem}.1`, `${process.ppid}\n`);
  await assert.rejects(acquireBuildLock(destination), /is locked by build process/);

  const beforeBoot = new Date(Date.now() - uptime() * 1000 - 60_000);
  await utimes(`${stem}.1`, beforeBoot, beforeBoot);
  const release = await acquireBuildLock(destination);
  assert.deepEqual((await generations(destination)).map((generation) => generation.number), [2]);
  await release();
});

test('a build killed while holding the lock does not block later builds', { timeout: 10000 }, async (t) => {
  const { directory, destination } = await fixture(t);
  const child = fork(new URL('../support/hold-build-lock.mjs', import.meta.url), [destination], { stdio: ['ignore', 'ignore', 'inherit', 'ipc'] });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit');
      child.kill('SIGKILL');
      await exited;
    }
  });
  const ready = await Promise.race([
    once(child, 'message').then(([message]) => message),
    once(child, 'exit').then(([code]) => { throw new Error(`lock holder exited early: ${code}`); }),
  ]);
  assert.equal(ready, 'locked');
  await assert.rejects(acquireBuildLock(destination), /is locked by build process \d+/);
  assert.deepEqual(await readdir(directory), [], 'coordination must not create filesystem state');

  const exited = once(child, 'exit');
  child.kill('SIGKILL');
  await exited;

  const release = await acquireBuildLock(destination);
  await release();
  const releaseAgain = await acquireBuildLock(destination);
  await releaseAgain();
  assert.deepEqual(await readdir(directory), []);
});

test('a destination spelled with other letter case gets the same lock on a case-insensitive disk', async (t) => {
  const { directory, destination } = await fixture(t);
  await writeFile(join(directory, 'case-probe'), '');
  if (!existsSync(join(directory, 'CASE-PROBE'))) {
    t.skip('the temporary directory is case-sensitive');
    return;
  }

  await mkdir(destination);
  const variant = join(directory.toUpperCase(), 'DIST');
  assert.equal(buildLockPath(variant), buildLockPath(destination));
  const release = await acquireBuildLock(destination);
  await assert.rejects(acquireBuildLock(variant), /is locked by build process/);
  await release();
});

test('an output that does not exist yet gets one lock for every letter case of its name', async (t) => {
  const { directory, destination } = await fixture(t);
  const variant = join(directory, 'DIST');
  assert.ok(!existsSync(destination));

  assert.equal(buildLockPath(variant), buildLockPath(destination));
  const release = await acquireBuildLock(destination);
  await assert.rejects(acquireBuildLock(variant), /is locked by build process/);
  await release();
});

test('builds racing for one stale lock never hold it together', { timeout: 60000 }, async (t) => {
  const { directory } = await fixture(t);
  // spawnSync has reaped this child, so its pid no longer belongs to any process.
  const { pid } = spawnSync(process.execPath, ['--version']);

  for (let round = 0; round < 5; round += 1) {
    const destination = join(directory, `dist-${round}`);
    t.after(() => removeBuildLocks(destination));
    await writeFile(`${buildLockPath(destination)}.1`, `${pid}\n`);

    const overlaps = await contend(destination, join(directory, `marker-${round}`), 12);
    assert.equal(overlaps, 0, `round ${round}: two processes were inside the critical section`);
  }
});
