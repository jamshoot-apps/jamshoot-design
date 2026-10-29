import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { buildDocs } from '../../scripts/docs/build.mjs';
import { pagesToBuild } from '../../scripts/docs/pages.mjs';
import { llmsText } from '../../scripts/llms.mjs';
import { LAYERS } from '../../src/tokens/contract.js';
import { LIB } from '../support/library.mjs';
import { removeBuildLocks } from '../support/build-locks.mjs';
import { expand } from '../../scripts/tables.mjs';
import { fencedBlocks } from '../../scripts/docs/fences.mjs';

test('documentation output refuses unowned files and preserves the last build on failure', async (t) => {
  const out = await mkdtemp(join(tmpdir(), 'jamshoot-docs-guard-'));
  t.after(() => { removeBuildLocks(out); return rm(out, { recursive: true, force: true }); });
  const valuable = join(out, 'valuable.txt');
  await writeFile(valuable, 'original');
  await assert.rejects(buildDocs(out), /not an empty or JamShoot-owned directory/);
  assert.equal(await readFile(valuable, 'utf8'), 'original');
  await rm(valuable);
  await buildDocs(out);
  const original = await readFile(join(out, 'index.html'), 'utf8');
  await writeFile(join(out, 'obsolete.html'), 'old generation');
  await buildDocs(out);
  assert.ok(!(await readdir(out)).includes('obsolete.html'));
  const originalWrite = fs.promises.writeFile;
  t.mock.method(fs.promises, 'writeFile', (path, ...args) => String(path).endsWith('molecules-card.html')
    ? Promise.reject(new Error('example write failed')) : originalWrite(path, ...args));
  syncBuiltinESMExports();
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
  await assert.rejects(buildDocs(out), /example write failed/);
  assert.equal(await readFile(join(out, 'index.html'), 'utf8'), original);
  assert.ok((await readdir(out)).includes('molecules-card.html'));
});

test('the built reference retains every page, navigation, examples and shared assets', async (t) => {
  const out = await mkdtemp(join(tmpdir(), 'jamshoot-docs-'));
  t.after(() => { removeBuildLocks(out); return rm(out, { recursive: true, force: true }); });
  const pages = pagesToBuild();
  assert.equal(await buildDocs(out), pages.length);
  const files = await readdir(out);
  assert.deepEqual(files.filter((name) => name.endsWith('.html')).sort(), pages.map(({ slug }) => `${slug}.html`).sort());
  let cssHref;
  let jsHref;
  for (const { slug } of pages) {
    const html = await readFile(join(out, `${slug}.html`), 'utf8');
    const css = html.match(/href="(styles\/docs\.[a-f0-9]{8}\.css)"/)?.[1];
    const js = html.match(/src="(scripts\/docs\.[a-f0-9]{8}\.js)"/)?.[1];
    assert.ok(css, `${slug}: missing stylesheet`);
    assert.ok(js, `${slug}: missing runtime`);
    cssHref ??= css;
    jsHref ??= js;
    assert.equal(css, cssHref);
    assert.equal(js, jsHref);
    const header = html.match(/<header\b[^>]*>([\s\S]*?)<\/header>/)?.[1];
    assert.match(header ?? '', /src="brand\/jamshoot\/logo\.svg"/);
    const nav = html.match(/<nav class="docs__nav"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
    assert.ok(nav, `${slug}: missing navigation`);
    assert.match(nav, new RegExp(`href="${slug}\\.html" aria-current="page"`));
    assert.equal((nav.match(/aria-current="page"/g) ?? []).length, 1);
  }
  const css = await readFile(join(out, cssHref), 'utf8');
  assert.match(await readFile(join(out, jsHref), 'utf8'), /jamshoot-docs:sidebar:/);
  assert.ok(css.startsWith(`@layer ${LAYERS.join(', ')};`));
  assert.match(css, /@layer site\.blocks \{/);
  const card = await readFile(join(out, 'molecules-card.html'), 'utf8');
  const architecture = await readFile(join(out, 'architecture.html'), 'utf8');
  assert.match(architecture, /<figure class="css-assembly">/);
  assert.match(architecture, /site\/dist\/styles\/site\.&lt;hash&gt;\.css/);
  assert.doesNotMatch(architecture, /css-assembly\.svg/);
  assert.match(card, /class="example__stage"><div class="ds-card/);
  assert.match(card, /class="example__source"><code>/);
  assert.match(card, /<div class="generated">/);
  const layout = await readFile(join(out, 'foundations-layout.html'), 'utf8');
  const brand = await readFile(join(out, 'foundations-brand.html'), 'utf8');
  for (const name of ['container', 'stack', 'cluster', 'grid', 'split']) {
    assert.match(layout, new RegExp(`class="ds-${name}(?:[ "\\-])`));
    assert.ok(layout.includes(`<a href="layout-${name}.html"><code>${name}()</code></a>`));
  }
  assert.match(brand, /class="example__stage"><span class="ds-brand"/);
  assert.match(brand, /src="brand\/example.svg"/);
  assert.ok(brand.includes('<a href="atoms-brand.html"><code>brand()</code></a>'));
  assert.equal(await readFile(join(out, 'llms.txt'), 'utf8'), llmsText());
  // Check the published catalog, then every linked Markdown page and its onward links.
  const markdownPaths = ['llms.txt', ...pages.map(({ path }) => relative(LIB, path))];
  const slugs = new Map(pages.map(({ path, slug }) => [path, slug]));
  for (const path of markdownPaths) {
    const source = await readFile(join(out, path), 'utf8');
    if (path !== 'llms.txt') {
      assert.equal(source, expand(await readFile(join(LIB, path), 'utf8')));
    }
    const html = path === 'llms.txt' ? null : await readFile(join(out, `${slugs.get(join(LIB, path))}.html`), 'utf8');
    // Code fences contain illustrative URLs, not documentation links.
    const prose = [...fencedBlocks(source)].filter((block) => typeof block === 'string').join('\n');
    for (const [, href] of prose.matchAll(/(?<!!)\[[^\]]+\]\(([^)]+)\)/g)) {
      if (/^(?:[a-z]+:|\/)/i.test(href)) continue;
      const [target, fragment] = href.split('#');
      const destination = resolve(out, dirname(path), target || '');
      const targetPath = target ? destination : join(out, path);
      const published = await readFile(targetPath, 'utf8');
      const slug = slugs.get(resolve(LIB, dirname(path), target || ''));
      const renderedHref = target ? slug ? `${slug}.html` : relative(out, destination) : '';
      if (html) assert.ok(html.includes(`href="${renderedHref}${fragment ? `#${fragment}` : ''}"`), `${path}: ${href} lost in HTML`);
      if (fragment && targetPath.endsWith('.md')) {
        const headings = [...published.matchAll(/^#{1,4}\s+(.+)$/gm)].map(([, title]) =>
          title.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-|-$/g, ''));
        assert.ok(headings.includes(fragment), `${path}: missing anchor ${href}`);
      }
    }
  }
  const home = await readFile(join(out, 'index.html'), 'utf8');
  assert.match(home, /<h1 id="overview">Overview<\/h1>/);
  assert.match(home, /<title>Overview — JamShoot Design<\/title>/);
  assert.match(home, /href="llms.txt"/);
  assert.match(home, /class="example__stage"><section/);
  assert.ok(home.indexOf('href="authoring.html"') < home.indexOf('href="adding-a-component.html"'));
  const nav = home.match(/<nav class="docs__nav"[^>]*>([\s\S]*?)<\/nav>/)[1];
  assert.deepEqual([...nav.matchAll(/<strong[^>]*>([^<]+)<\/strong>/g)].map(([, label]) => label),
    ['Start here', 'Build a site', 'Foundations', 'Layout', 'Atoms', 'Molecules', 'Organisms', 'Contributing']);
  for (const [heading, slugs] of [
    ['Start here', ['index', 'architecture', 'authoring']],
    ['Build a site', ['configuration', 'theming', 'conventions', 'anti-patterns']],
    ['Foundations', ['foundations-color', 'foundations-type', 'foundations-space', 'foundations-brand', 'foundations-icons', 'foundations-language', 'foundations-markup']],
    ['Layout', ['foundations-layout', 'layout-cluster', 'layout-container', 'layout-grid', 'layout-split', 'layout-stack']],
    ['Molecules', ['molecules', 'molecules-card', 'molecules-definitions', 'molecules-faq', 'molecules-figure', 'molecules-plan', 'molecules-proof', 'molecules-steps', 'molecules-table']],
    ['Organisms', ['organisms-hero', 'organisms-section', 'organisms-subsection', 'organisms-cta', 'organisms-pageHeader', 'organisms-legalDocument', 'organisms-header', 'organisms-footer']],
    ['Contributing', ['adding-a-component', 'testing']],
  ]) {
    const section = nav.split(`>${heading}</strong>`)[1].split('<strong')[0];
    assert.deepEqual([...section.matchAll(/href="([^"]+)\.html"/g)].map(([, slug]) => slug), slugs);
  }
  assert.equal((nav.match(/<a /g) ?? []).length, pages.length, 'each page appears exactly once');
  for (const [slug, label] of [['index', 'Overview'], ['anti-patterns', 'Rules and checks'],
    ['foundations-layout', 'Choosing a layout'], ['foundations-language', 'Interface language']]) {
    assert.match(nav, new RegExp(`href="${slug}\\.html"[^>]*>${label}</a>`));
  }
  assert.match(nav, /<strong class="docs__reference-start">Layout<\/strong>/);
  assert.match(await readFile(join(out, 'licenses/ionicons.txt'), 'utf8'), /MIT License/);
  assert.ok((await readdir(join(out, 'brand'))).length);
  for (const name of ['logo.svg', 'LICENSE.txt']) {
    assert.equal(await readFile(join(out, 'brand/jamshoot', name), 'utf8'),
      await readFile(join(LIB, 'docs/assets/brand/jamshoot', name), 'utf8'));
  }
});
