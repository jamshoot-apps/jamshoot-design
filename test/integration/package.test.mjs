import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fencedBlocks } from '../../scripts/docs/fences.mjs';
import { LIB } from '../support/library.mjs';
import { removeBuildLocks } from '../support/build-locks.mjs';

const manifest = JSON.parse(readFileSync(join(LIB, 'package.json'), 'utf8'));
const run = (command, args, cwd = LIB) => {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', timeout: 30_000 });
  assert.equal(result.status, 0, `${command} ${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
};
const packReport = (text) => {
  const report = JSON.parse(text);
  return Array.isArray(report) ? report[0] : report[manifest.name];
};

test('the npm archive contains the library and offline API contracts without repository tools', () => {
  assert.equal(manifest.name, '@jamshoot-apps/design');
  assert.notEqual(manifest.private, true);
  assert.equal(manifest.license, 'Apache-2.0');
  assert.deepEqual(manifest.dependencies, {});
  assert.equal(manifest.publishConfig.access, 'public');
  assert.equal(manifest.repository.url, 'git+https://github.com/jamshoot-apps/jamshoot-design.git');

  const packed = packReport(run('npm', ['pack', '--dry-run', '--json', '--ignore-scripts']));
  const paths = new Set(packed.files.map(({ path }) => path));
  for (const path of ['LICENSE', 'NOTICE', 'README.md', 'llms.txt', 'src/index.js',
    'src/cli/build.mjs', 'src/cli/lint.mjs', 'src/tokens/contract.js',
    'src/runtime/theme.js', 'src/styles/base.css', 'src/assets/icons/LICENSE.txt',
    'src/components/molecules/card/README.md']) {
    assert.ok(paths.has(path), `Missing published file: ${path}`);
  }
  for (const path of paths) {
    assert.ok(path.startsWith('src/') || ['package.json', 'README.md', 'LICENSE', 'NOTICE', 'llms.txt'].includes(path),
      `Repository-only file shipped in npm: ${path}`);
    assert.doesNotMatch(path, /(?:\.test\.mjs|\.log|\.tgz|\.pem|\.key|\.DS_Store)$/);
    assert.ok(!path.startsWith('src/assets/brand/'), `Documentation artwork shipped in npm: ${path}`);
  }
});

test('an offline tarball installation builds and lints a site through public exports and executables', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'jamshoot-package-'));
  t.after(() => {
    removeBuildLocks(join(root, 'site/dist'), join(root, 'site/programmatic-dist'));
    return rm(root, { recursive: true, force: true });
  });
  const packed = packReport(run('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', root]));
  const site = join(root, 'site');
  await cp(join(LIB, 'test/fixtures/site'), site, { recursive: true, filter: (path) => basename(path) !== 'dist' });
  await writeFile(join(site, 'package.json'), '{"private":true,"type":"module"}\n');
  for (const [file, before, after] of [
    ['pages.js', '../../../src/index.js', '@jamshoot-apps/design'],
    ['blocks/sample.js', '../../../../src/markup.js', '@jamshoot-apps/design/markup'],
  ]) {
    const path = join(site, file);
    const source = await readFile(path, 'utf8');
    assert.ok(source.includes(before), `Fixture import missing: ${file}`);
    await writeFile(path, source.replace(before, after));
  }
  run('npm', ['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', join(root, packed.filename)], site);
  assert.match(run('npm', ['exec', '--offline', '--', 'jamshoot-build', '.'], site), /built 2 pages/);
  const lint = run('npm', ['exec', '--offline', '--', 'jamshoot-lint', '.'], site);
  assert.match(lint, /clean/);
  assert.doesNotMatch(lint, /skipped/);
  assert.match(run('npm', ['exec', '--offline', '--', 'jamshoot-dev', '--list'], site), /site/);
  await writeFile(join(site, 'mark.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64"/></svg>');
  run('npm', ['exec', '--offline', '--', 'jamshoot-og-image', '.', '--html', join(root, 'share.html'),
    '--pattern', 'none', '--icon', 'mark.svg'], site);
  assert.match(await readFile(join(root, 'share.html'), 'utf8'), /<!doctype html>/i);
  run(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { readFile } from 'node:fs/promises';
    import { card } from '@jamshoot-apps/design';
    import { h } from '@jamshoot-apps/design/markup';
    import { ROLES } from '@jamshoot-apps/design/contract';
    import { buildSite } from '@jamshoot-apps/design/build';
    import { site } from './site.config.js';
    import { pages } from './pages.js';
    assert.match(String(card({ title: 'Packed component' })), /Packed component/);
    assert.match(String(h('p', { text: '<text>' })), /&lt;text&gt;/);
    assert.ok(ROLES.length > 0);
    const palette = await readFile(new URL(import.meta.resolve('@jamshoot-apps/design/themes/light.css')), 'utf8');
    assert.match(palette, /--ds-bg/);
    await buildSite({ root: process.cwd(), site, pages, out: process.cwd() + '/programmatic-dist' });
  `], site);

  const installed = join(site, 'node_modules/@jamshoot-apps/design');
  for (const { path } of packed.files) {
    if (!path.endsWith('.md') && path !== 'llms.txt') continue;
    const text = await readFile(join(installed, path), 'utf8');
    const prose = [...fencedBlocks(text)].filter((part) => typeof part === 'string').join('\n');
    for (const [, href] of prose.matchAll(/(?<!!)\[[^\]]+\]\(([^)]+)\)/g)) {
      if (/^(?:[a-z]+:|\/|#)/i.test(href)) continue;
      const target = resolve(installed, dirname(path), href.split('#')[0]);
      assert.ok(target.startsWith(installed + '/'), `${path}: reference leaves package: ${href}`);
      await readFile(target);
    }
  }
});
