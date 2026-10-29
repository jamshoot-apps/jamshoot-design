import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { renderFingerprint, sourceFingerprint, withSourceFingerprint } from '../../src/cli/og-image.mjs';

const CLI = fileURLToPath(new URL('../../src/cli/og-image.mjs', import.meta.url));
/* The smallest valid PNG: one pixel, with real IHDR and IEND CRCs. */
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const root = mkdtempSync(join(tmpdir(), 'ds-og-'));
test.after(() => rmSync(root, { recursive: true, force: true }));
writeFileSync(join(root, 'package.json'), '{"type":"module"}');
writeFileSync(join(root, 'pages.js'), 'export const pages = [];');
writeFileSync(join(root, 'site.config.js'), "export const site = {brand: {name: 'Example', logo: 'logo.svg'}};");
writeFileSync(join(root, 'logo.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64"/></svg>');
writeFileSync(join(root, 'theme.css'), ':root { --ds-surface: #fff; --ds-text: #111; --ds-text-muted: #333; }');
const run = (...args) => spawnSync(process.execPath, [CLI, root, ...args], { encoding: 'utf8' });

test('OG HTML generation needs no browser and rejects malformed CLI input', () => {
  const html = join(root, 'preview.html');
  const result = run('--html', html, '--pattern', 'none', '--title=Example & <notes>');
  assert.equal(result.status, 0, result.stderr);
  assert.match(readFileSync(html, 'utf8'), /Example &amp; &lt;notes&gt;/);
  assert.match(readFileSync(html, 'utf8'), /system-ui/);
  assert.doesNotMatch(readFileSync(html, 'utf8'), /@font-face|IBMPlexSans/);
  for (const flags of [['--unknown'], ['--title'], ['--icon-size', '0'], ['--pattern', 'wrong'], ['--pattern', 'all', '--check'], ['--html', html, '--pattern', 'all'], ['--html', html, '--check']]) {
    const failed = run(...flags);
    assert.equal(failed.status, 1, flags.join(' '));
    assert.match(failed.stderr, /\[og-image\]/);
    assert.doesNotMatch(failed.stderr, /at main|ERR_MODULE/);
  }
});

test('OG uses configured site-owned fonts in its standalone HTML', () => {
  const site = join(root, 'with-font');
  mkdirSync(join(site, 'assets/fonts'), { recursive: true });
  writeFileSync(join(site, 'package.json'), '{"type":"module"}');
  writeFileSync(join(site, 'pages.js'), 'export const pages = [];');
  writeFileSync(join(site, 'logo.svg'), readFileSync(join(root, 'logo.svg')));
  writeFileSync(join(site, 'theme.css'), readFileSync(join(root, 'theme.css')));
  writeFileSync(join(site, 'assets/fonts/site.woff2'), Buffer.from('site-font-fixture'));
  writeFileSync(join(site, 'site.config.js'), "export const site = {brand: {name: 'Example', logo: 'logo.svg'}, fonts: {sans: {family: 'Example Sans', fallback: 'sans-serif', files: [{weight: 400, path: 'assets/fonts/site.woff2'}]}}};");
  const target = join(site, 'card.html');
  const result = spawnSync(process.execPath, [CLI, site, '--html', target], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const html = readFileSync(target, 'utf8');
  assert.match(html, /Example Sans/);
  assert.match(html, /data:font\/woff2;base64,c2l0ZS1mb250LWZpeHR1cmU=/);
  assert.doesNotMatch(html, /url\("\.\.\/assets/);
});

test('OG uses strict shared color parsing for automatic ink selection', () => {
  const html = join(root, 'color.html');
  for (const bg of ['#12345', 'rgb(999 0 0)', 'rgb(0 0 0) trailing']) {
    const result = run('--html', html, '--bg', bg);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Could not read/);
  }
  const result = run('--html', html, '--bg', 'rgb(255 255 255 / 100%)');
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /Could not read/);
  assert.match(readFileSync(html, 'utf8'), /#17181a/);
});

test('OG stamps the rendered image with its source fingerprint and --check compares that without a browser', () => {
  const launches = join(root, 'launches.log');
  const browser = join(root, 'fake-chrome');
  writeFileSync(browser, `#!${process.execPath}\nimport fs from "node:fs";const arg=process.argv.find(x=>x.startsWith("--screenshot="));fs.writeFileSync(arg.slice(13),Buffer.from(${JSON.stringify(PIXEL.toString('base64'))},"base64"));fs.appendFileSync(${JSON.stringify(launches)},"launch\\n");`);
  chmodSync(browser, 0o755);
  const launched = () => (existsSync(launches) ? readFileSync(launches, 'utf8').split('\n').filter(Boolean).length : 0);
  const card = join(root, 'nested/card.png');
  const args = ['--chrome', browser, '--pattern', 'none', '--out', 'nested/card.png'];

  const made = run(...args);
  assert.equal(made.status, 0, made.stderr);
  assert.equal(launched(), 1);
  assert.notEqual(sourceFingerprint(readFileSync(card)), null);
  assert.deepEqual(readdirSync(join(root, 'nested')), ['card.png'], 'the render is staged and renamed, leaving no temporary file');

  const previewed = run('--html', join(root, 'expected.html'), '--pattern', 'none');
  assert.equal(previewed.status, 0, previewed.stderr);
  assert.equal(sourceFingerprint(readFileSync(card)), renderFingerprint(readFileSync(join(root, 'expected.html'), 'utf8')));

  const current = run(...args, '--check');
  assert.equal(current.status, 0, current.stderr);
  assert.match(current.stdout, /is current/);
  assert.equal(launched(), 1, '--check must not launch a browser');

  writeFileSync(card, withSourceFingerprint(PIXEL, renderFingerprint('<p>an older card</p>')));
  const changed = run(...args, '--check');
  assert.equal(changed.status, 1);
  assert.match(changed.stderr, /is stale: the card has changed since it was rendered — run: npx --no-install jamshoot-og-image \S+ --pattern=none --out=nested\/card\.png$/m);

  writeFileSync(card, PIXEL);
  assert.match(run(...args, '--check').stderr, /is stale: it has no source fingerprint/);

  writeFileSync(card, 'older-content');
  assert.match(run(...args, '--check').stderr, /is stale/);

  rmSync(card);
  assert.match(run(...args, '--check').stderr, /is missing/);
  assert.equal(launched(), 1);
});

test('OG does not stamp an image that Chrome did not rewrite', () => {
  const browser = join(root, 'silent-chrome');
  writeFileSync(browser, `#!${process.execPath}\n// Exits 0 and writes nothing, as a browser can when it leaves an old file in place.\n`);
  chmodSync(browser, 0o755);
  mkdirSync(join(root, 'silent'), { recursive: true });
  const card = join(root, 'silent/card.png');
  const previous = withSourceFingerprint(PIXEL, renderFingerprint('<p>an older card</p>'));
  writeFileSync(card, previous);
  const args = ['--chrome', browser, '--pattern', 'none', '--out', 'silent/card.png'];

  const made = run(...args);
  assert.equal(made.status, 1, made.stdout);
  assert.match(made.stderr, /exited without writing a PNG, so .* was not updated/);
  assert.deepEqual(readFileSync(card), previous, 'the old image must not gain the new fingerprint');
  assert.deepEqual(readdirSync(join(root, 'silent')), ['card.png']);
  assert.match(run(...args, '--check').stderr, /is stale: the card has changed since it was rendered/);
});

test('OG hints at a regeneration command that repeats every card-affecting flag, shell-quoted', () => {
  const args = ['--check', '--chrome', join(root, 'no-such-chrome'), '--pattern', 'grid', '--bg', 'accent', '--title', 'Two words', '--subtitle', "Don't stop", '--out', 'hint dir/card.png'];

  const missing = run(...args);
  assert.equal(missing.status, 1, missing.stdout);
  const hint = missing.stderr.match(/ is missing — run: npx --no-install jamshoot-og-image (.+)\n/)?.[1];
  assert.ok(hint, missing.stderr);
  assert.doesNotMatch(hint, /--check|--chrome|--html/);

  // Read the hint back as a shell would: each word must arrive exactly as it was typed.
  const shell = spawnSync('/bin/sh', ['-c', `printf '%s\\0' ${hint}`], { encoding: 'utf8' });
  const [site, ...words] = shell.stdout.split('\0').slice(0, -1);
  assert.match(site, /ds-og-/);
  // Flags come back in the CLI's own order, so the hint is the same whichever order the caller typed them in.
  assert.deepEqual(words, ['--pattern=grid', '--out=hint dir/card.png', '--title=Two words', "--subtitle=Don't stop", '--bg=accent']);
});

test('OG hints with the flags of a stale image, not the defaults', () => {
  const args = ['--check', '--pattern', 'grid', '--title', 'Two words', '--out', 'stale/card.png'];
  mkdirSync(join(root, 'stale'), { recursive: true });
  writeFileSync(join(root, 'stale/card.png'), withSourceFingerprint(PIXEL, renderFingerprint('<p>an older card</p>')));

  const stale = run(...args);
  assert.equal(stale.status, 1, stale.stdout);
  assert.match(stale.stderr, /is stale: the card has changed since it was rendered — run: npx --no-install jamshoot-og-image \S+ --pattern=grid --out=stale\/card\.png --title='Two words'$/m);
});

test('OG hints parse back: a value may start with "-" and a relative site path cannot be a site name', () => {
  const inParent = (...args) => spawnSync(process.execPath, [CLI, ...args], { cwd: dirname(root), encoding: 'utf8' });
  const missing = inParent(basename(root), '--check', '--title=-beta', '--out', 'beta/card.png');
  assert.equal(missing.status, 1, missing.stdout);
  const hint = missing.stderr.match(/ is missing — run: npx --no-install jamshoot-og-image (.+)\n/)?.[1];
  assert.equal(hint, `./${basename(root)} --out=beta/card.png --title=-beta`);
  // The hinted words reach the same check rather than an argument error.
  assert.match(inParent(...hint.split(' '), '--check').stderr, / is missing — run: /);
});

test('OG escapes the page language from site.config.js', () => {
  const site = join(root, 'with-lang');
  mkdirSync(site);
  writeFileSync(join(site, 'package.json'), '{"type":"module"}');
  writeFileSync(join(site, 'pages.js'), 'export const pages = [];');
  writeFileSync(join(site, 'logo.svg'), readFileSync(join(root, 'logo.svg')));
  writeFileSync(join(site, 'theme.css'), readFileSync(join(root, 'theme.css')));
  writeFileSync(join(site, 'site.config.js'), `export const site = ${JSON.stringify({ lang: 'en" onload="x', brand: { name: 'Example', logo: 'logo.svg' } })};`);
  const target = join(site, 'card.html');
  const result = spawnSync(process.execPath, [CLI, site, '--html', target], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(readFileSync(target, 'utf8'), /<html lang="en&quot; onload=&quot;x">/);
});
