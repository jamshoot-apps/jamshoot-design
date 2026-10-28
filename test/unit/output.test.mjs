import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, symlink } from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { replaceOutput } from '../../src/cli/output.js';
import { removeBuildLocks } from '../support/build-locks.mjs';

async function fixture(t) {
  const base = await mkdtemp(join(tmpdir(), 'ds-output-'));
  t.after(() => rm(base, { recursive: true, force: true }));
  const root = join(base, 'site');
  const source = join(root, 'content');
  await mkdir(source, { recursive: true });
  await writeFile(join(source, 'valuable.txt'), 'original source');
  return { base, root, source, options: { root, sources: [source], owner: 'test output v1\n' } };
}

test('output refuses sources, ancestors, symlink aliases and populated unowned directories', async (t) => {
  const { base, root, source, options } = await fixture(t);
  await symlink(source, join(base, 'alias'));
  const unowned = join(base, 'unowned');
  t.after(() => removeBuildLocks(unowned, join(base, 'alias')));
  await mkdir(unowned);
  await writeFile(join(unowned, 'valuable.txt'), 'unowned original');
  // A marker never overrides source protection.
  await writeFile(join(source, '.jamshoot-build'), options.owner);
  for (const out of [base, root, source, join(source, 'nested'), join(base, 'alias/nested')]) {
    await assert.rejects(replaceOutput(out, options, () => assert.fail('unsafe output reached generation')), /dedicated directory/);
  }
  for (const out of [unowned, join(base, 'alias')]) {
    await assert.rejects(replaceOutput(out, options, () => assert.fail('unowned output reached generation')), /not an empty or JamShoot-owned/);
  }
  assert.equal(await readFile(join(source, 'valuable.txt'), 'utf8'), 'original source');
  assert.equal(await readFile(join(unowned, 'valuable.txt'), 'utf8'), 'unowned original');
});

test('failed output generation and failed promotion retain the previous generation', async (t) => {
  const { base, root, options } = await fixture(t);
  const out = join(root, 'dist');
  t.after(() => removeBuildLocks(out));
  const generate = (value) => (staging) => writeFile(join(staging, 'index.html'), value);
  await replaceOutput(out, options, generate('previous'));
  await assert.rejects(replaceOutput(out, options, async (staging) => {
    await generate('partial')(staging);
    throw new Error('render failed');
  }), /render failed/);
  assert.equal(await readFile(join(out, 'index.html'), 'utf8'), 'previous');
  const originalRename = fs.promises.rename;
  t.mock.method(fs.promises, 'rename', (from, to) => from.endsWith('/next')
    ? Promise.reject(new Error('promotion failed')) : originalRename(from, to));
  syncBuiltinESMExports();
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
  await assert.rejects(replaceOutput(out, options, generate('next')), /promotion failed/);
  assert.equal(await readFile(join(out, 'index.html'), 'utf8'), 'previous');
  assert.deepEqual(await readdir(root), ['content', 'dist']);
  assert.deepEqual(await readdir(base), ['site']);
});

test('a failed rollback leaves a recoverable backup instead of deleting it', async (t) => {
  const { root, options } = await fixture(t);
  const out = join(root, 'dist');
  t.after(() => removeBuildLocks(out));
  await replaceOutput(out, options, (staging) => writeFile(join(staging, 'index.html'), 'previous'));
  const originalRename = fs.promises.rename;
  t.mock.method(fs.promises, 'rename', (from, to) => from.endsWith('/next') || from.endsWith('/previous')
    ? Promise.reject(new Error('rename failed')) : originalRename(from, to));
  syncBuiltinESMExports();
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
  await assert.rejects(replaceOutput(out, options, (staging) => writeFile(join(staging, 'index.html'), 'next')), /rename failed/);
  const workspace = (await readdir(root)).find((name) => name.startsWith('.dist-build-'));
  assert.ok(workspace);
  assert.equal(await readFile(join(root, workspace, 'previous/index.html'), 'utf8'), 'previous');
});

test('a letter-case alias of a source is refused on a case-insensitive disk', async (t) => {
  const { base, options } = await fixture(t);
  if (!fs.existsSync(join(base, 'SITE'))) {
    t.skip('the temporary directory is case-sensitive');
    return;
  }
  // A marker never overrides source protection, whatever the spelling.
  await writeFile(join(base, 'site/content/.jamshoot-build'), options.owner);
  for (const out of [join(base, 'SITE/CONTENT'), join(base, 'SITE/CONTENT/dist'), join(base.toUpperCase(), 'site/Content/dist')]) {
    await assert.rejects(replaceOutput(out, options, () => assert.fail('unsafe output reached generation')), /dedicated directory/);
  }
  assert.equal(await readFile(join(base, 'site/content/valuable.txt'), 'utf8'), 'original source');
});

test('same-process builds of one output spelled in different letter case queue', async (t) => {
  const { root, options } = await fixture(t);
  const out = join(root, 'dist');
  t.after(() => removeBuildLocks(out));
  const generate = (value) => async (staging) => {
    await new Promise((resolve) => setTimeout(resolve, 20));
    await writeFile(join(staging, 'index.html'), value);
  };
  await Promise.all([replaceOutput(out, options, generate('first')), replaceOutput(join(root, 'DIST'), options, generate('second'))]);
  assert.equal(await readFile(join(root, 'DIST/index.html'), 'utf8'), 'second');
});
