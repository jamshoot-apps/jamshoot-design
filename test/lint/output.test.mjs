import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lint, skipped } from '../../src/cli/lint.mjs';
import { ruleNames, rulesFor } from '../support/lint-site.mjs';
import { theme } from '../support/lint-site.mjs';

test('lint CLI reads ogImage from site.config.js and fails only for missing local files', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'ds-og-lint-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(root, 'package.json'), '{"type":"module"}');
  writeFileSync(join(root, 'theme.css'), theme);
  const cli = fileURLToPath(new URL('../../src/cli/lint.mjs', import.meta.url));
  const run = (site) => {
    writeFileSync(join(root, 'site.config.js'), `export const site = ${JSON.stringify(site)};`);
    return spawnSync(process.execPath, [cli, root], { encoding: 'utf8' });
  };
  assert.equal(run({}).status, 0);
  const site = { ogImage: { path: 'assets/og.png', width: 1200, height: 630 } };
  const missing = run(site);
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /og-image\s+site.config.js/);
  mkdirSync(join(root, 'assets'));
  writeFileSync(join(root, 'assets/og.png'), 'image');
  assert.equal(run(site).status, 0);
});

test('OG lint requires only configured local files, without requiring a build', () => {
  const check = (path, files = {}, url = 'https://example.com/app/') => rulesFor(files, {
    site: { url, ...(path === undefined ? {} : { ogImage: { path, width: 1200, height: 630 } }) },
  }).filter((entry) => entry.rule === 'og-image');
  assert.deepEqual(check(undefined), []);
  assert.deepEqual(check('https://cdn.example.com/og.png'), []);
  assert.deepEqual(check('//cdn.example.com/og.png'), []);
  const missing = check('assets/og.png');
  assert.equal(missing.length, 1);
  assert.equal(missing[0].where, 'site.config.js');
  assert.match(missing[0].detail, /assets\/og.png/);
  assert.equal(check('assets', { 'assets/other.png': 'image' }).length, 1, 'a directory is not an image file');
  for (const path of ['assets/og%20card.png?version=1#preview', '/app/assets/og%20card.png']) {
    assert.deepEqual(check(path, { 'assets/og card.png': 'image' }), []);
  }
  assert.deepEqual(check('assets/og.png', { 'assets/og.png': 'image' }, ''), []);
});

test('the rules that read dist/ are skipped out loud when there is no dist/', () => {
  const results = rulesFor({ 'blocks/scene.css': '.cb-scene { display: none; }\n' });

  assert.deepEqual(
    ruleNames(results).filter((name) => name === 'no-js-content' || name === 'assets'),
    [],
    'an unbuilt site failed a rule about output that does not exist yet',
  );

  assert.ok(
    skipped.some((note) => note.includes('no-js-content')),
    'the build rules were skipped without saying so',
  );
});

test('OG lint checks existing build output as well as the source file', (t) => {
  const defaultOutput = rulesFor({ 'og.png': 'source image', 'dist/.keep': '' }, {
    site: { ogImage: { path: 'og.png', width: 1200, height: 630 } },
  }).filter((entry) => entry.rule === 'og-image');
  assert.equal(defaultOutput.length, 1, 'an image in the source root does not ship automatically');
  assert.match(defaultOutput[0].detail, /missing from build output/);
  const root = mkdtempSync(join(tmpdir(), 'ds-og-output-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(root, 'theme.css'), theme);
  writeFileSync(join(root, 'og card.png'), 'source image');
  const site = { url: 'https://example.com/app/', ogImage: { path: '/app/og%20card.png?v=1#preview', width: 1200, height: 630 } };
  const dist = join(root, 'custom-output');
  const check = () => lint(root, { site, dist }).filter((entry) => entry.rule === 'og-image');
  assert.deepEqual(check(), [], 'no build means only the source is checked');
  mkdirSync(dist);
  let errors = check();
  assert.equal(errors.length, 1);
  assert.match(errors[0].detail, /missing from build output/);
  assert.ok(errors[0].detail.includes(dist), 'the configured output directory must be checked');
  mkdirSync(join(dist, 'og card.png'));
  assert.equal(check().length, 1, 'an output directory cannot substitute for the image');
  rmSync(join(dist, 'og card.png'), { recursive: true });
  writeFileSync(join(dist, 'og card.png'), 'built image');
  assert.deepEqual(check(), []);
  rmSync(join(root, 'og card.png'));
  errors = check();
  assert.equal(errors.length, 1);
  assert.match(errors[0].detail, /does not name a local image file/);
  assert.deepEqual(lint(root, { site: {}, dist }).filter((entry) => entry.rule === 'og-image'), []);
});

test('build rules recurse into nested page destinations', () => {
  const results = rulesFor({ 'dist/legal/privacy.html': '<title>Privacy</title>' });

  assert.ok(
    results.some((entry) => entry.rule === 'no-js-content' && entry.where === 'legal/privacy.html'),
    'a nested HTML page was skipped',
  );
});

test('an empty dist directory is a failure, not a passing build', () => {
  const results = rulesFor({ 'dist/.keep': '' });

  assert.ok(
    results.some((entry) => entry.rule === 'no-js-content' && entry.detail.includes('no HTML pages')),
    'an empty output directory passed the build rules',
  );
});

