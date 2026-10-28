import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fencedBlocks } from '../../scripts/docs/fences.mjs';
import { runExample } from '../../scripts/docs/examples.mjs';
import { LIB, read } from '../support/library.mjs';
import { removeBuildLocks } from '../support/build-locks.mjs';

test('the documented starter builds and lints through the installed package API', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'jamshoot-starter-'));
  t.after(() => { removeBuildLocks(join(root, 'dist')); return rm(root, { recursive: true, force: true }); });
  const blocks = [...fencedBlocks(read('docs/authoring.md'))].filter((block) => block.argument?.startsWith('file="'));
  assert.deepEqual(blocks.map(({ argument }) => argument), [
    'file="package.json"', 'file="site.config.js"', 'file="content/home.js"', 'file="content/support.js"', 'file="pages.js"',
  ]);
  for (const { argument, body } of blocks) {
    const path = join(root, argument.match(/file="([^"]+)"/)[1]);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body.join('\n'));
  }
  // Resolve the real public package without installing dependencies in the test suite.
  await mkdir(join(root, 'node_modules/@jamshoot-apps'), { recursive: true });
  await symlink(LIB, join(root, 'node_modules/@jamshoot-apps/design'), 'dir');
  await cp(join(LIB, 'src/tokens/themes/light.css'), join(root, 'theme.css'));
  const run = (name) => {
    const result = spawnSync(process.execPath, [`node_modules/@jamshoot-apps/design/src/cli/${name}.mjs`, '.'], {
      cwd: root, encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout + result.stderr;
  };
  assert.match(run('build'), /built 2 pages/);
  const lint = run('lint');
  assert.match(lint, /clean/);
  assert.doesNotMatch(lint, /skipped/);
  const home = await readFile(join(root, 'dist/index.html'), 'utf8');
  const support = await readFile(join(root, 'dist/support.html'), 'utf8');
  assert.match(home, /Keep your project notes and tasks together/);
  assert.match(home, /<h4[^>]*>How do I keep a copy\?<\/h4>/);
  assert.match(support, /<h1>Support<\/h1>/);
  assert.match(support, /id="project-files"/);
  for (const html of [home, support]) {
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
    assert.equal((html.match(/<header class="ds-header"/g) ?? []).length, 1);
    assert.equal((html.match(/<footer\b/g) ?? []).length, 1);
  }
});

test('the documented invalid option produces the quoted diagnostic', () => {
  const section = read('docs/authoring.md').split('## Correct invalid options\n')[1].split('\n## ')[0];
  const blocks = [...fencedBlocks(section)].filter((block) => typeof block !== 'string');
  const invalid = blocks.find(({ kind }) => kind === 'js').body.join('\n');
  const diagnostic = blocks.find(({ kind }) => kind === 'text').body.join('\n');
  assert.throws(() => runExample(invalid), (error) => {
    assert.equal(error.message, diagnostic);
    return true;
  });
  assert.match(runExample(blocks.find(({ kind }) => kind === 'example').body.join('\n')), /ds-button--ghost/);
});
