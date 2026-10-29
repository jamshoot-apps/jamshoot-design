/**
 * Builds the library-owned fixture into a temporary directory and checks what ships.
 * The point of a build-time system is that a crawler running no JavaScript sees the
 * whole page — that is what these assertions pin down.
 */

import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, readdirSync, rmSync, existsSync, symlinkSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { acquireBuildLock } from '../../src/cli/build-lock.js';
import { removeBuildLocks } from '../support/build-locks.mjs';
import { resolve } from 'node:path';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildSite, fontCss, fromSiteRoot } from '../../src/cli/build.mjs';
import { lint, skipped } from '../../src/cli/lint.mjs';
import { siteConfig, sitePages } from '../../src/config.js';
import { cta } from '../../src/index.js';
import { raw } from '../../src/markup.js';
import { pages } from '../fixtures/site/pages.js';
import { site } from '../fixtures/site/site.config.js';

const SITE = fileURLToPath(new URL('../fixtures/site/', import.meta.url));

const out = mkdtempSync(join(tmpdir(), 'ds-build-'));
const built = await buildSite({ root: SITE, site, pages, out });
const read = (file) => readFileSync(join(out, file), 'utf8');

test.after(() => { removeBuildLocks(out); rmSync(out, { recursive: true, force: true }); });

test('inlined built-in artwork ships with its complete MIT notice', () => {
  assert.equal(read('licenses/ionicons.txt'), readFileSync(new URL('../../src/assets/icons/LICENSE.txt', import.meta.url), 'utf8'));
});

test('share images are optional and configured paths do not invoke OG generation', async (t) => {
  const destination = mkdtempSync(join(tmpdir(), 'ds-optional-og-'));
  t.after(() => { removeBuildLocks(destination); rmSync(destination, { recursive: true, force: true }); });
  const { ogImage: _image, ...withoutImage } = site;
  await buildSite({ root: SITE, site: withoutImage, pages, out: destination });
  const without = readFileSync(join(destination, 'index.html'), 'utf8');
  assert.doesNotMatch(without, /property="og:image/);
  assert.match(without, /name="twitter:card" content="summary"/);
  const image = { path: 'assets/not-generated.png', width: 1200, height: 630 };
  await buildSite({ root: SITE, site: { ...withoutImage, url: 'https://example.com/', ogImage: image }, pages, out: destination });
  const withImage = readFileSync(join(destination, 'index.html'), 'utf8');
  assert.match(withImage, /property="og:image" content="https:\/\/example.com\/assets\/not-generated.png"/);
  assert.match(withImage, /property="og:image:width" content="1200"/);
  assert.match(withImage, /property="og:image:height" content="630"/);
  assert.ok(!existsSync(join(destination, image.path)), 'site build generated an image implicitly');
  assert.ok(lint(SITE, { dist: destination, site: { ...withoutImage, ogImage: image } })
    .some((entry) => entry.rule === 'og-image'), 'lint must report the missing image after a successful build');
});

test('every page is prerendered, titled and described', () => {
  for (const page of pages) {
    const markup = read(page.path);

    assert.ok(markup.startsWith('<!doctype html>'), `${page.path} has no doctype`);
    assert.ok(markup.includes(`<title>${page.meta.title}</title>`), `${page.path} title`);
    assert.ok(
      markup.includes(`<meta name="description" content="${page.meta.description}">`),
      `${page.path} description`,
    );
    assert.ok(markup.includes(`data-page="${page.id}"`), `${page.path} page id`);
  }
});

test('the copy is in the markup, not fetched by a script', () => {
  const markup = read('index.html');
  const withoutScripts = markup.replace(/<script[\s\S]*?<\/script>/g, '');

  // A sentence from each part of the fixture home page.
  for (const phrase of [
    'Build the page from the library checkout.',
    'Representative site block.',
    'The bundled stylesheet includes component folders',
    'The fixture covers the complete workflow.',
  ]) {
    assert.ok(withoutScripts.includes(phrase), `index.html is missing "${phrase}"`);
  }
});

test('each page links one hashed stylesheet and one hashed script', () => {
  for (const page of pages) {
    const markup = read(page.path);
    const styles = [...markup.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(([, href]) => href);
    const scripts = [...markup.matchAll(/<script[^>]*src="([^"]+)"/g)].map(([, src]) => src);

    assert.equal(styles.length, 1, `${page.path} stylesheets`);
    assert.equal(scripts.length, 1, `${page.path} scripts`);
    assert.match(styles[0], /^styles\/site\.[0-9a-f]{8}\.css$/);
    assert.match(scripts[0], /^scripts\/site\.[0-9a-f]{8}\.js$/);
  }
});

test('the same bundle is reused across pages rather than rebuilt per page', () => {
  assert.equal(readdirSync(join(out, 'styles')).length, 1);
  assert.equal(readdirSync(join(out, 'scripts')).length, 1);
});

test('a build-time block renderer is not shipped to the browser', () => {
  const script = read(built.jsHref);

  assert.ok(script.includes('data-nav-toggle'), 'the configured library runtime is missing');
  assert.ok(script.includes('clientReady'), 'the fixture client module is missing');
  assert.doesNotMatch(script, /Representative site block/, 'the build-time block renderer leaked into the bundle');
  assert.doesNotMatch(script, /\bimport\b/, 'a block renderer leaked into the browser bundle');
});

test('the site’s palettes become the selectors that switch between them', () => {
  const stylesheet = read(`styles/${built.cssName}`);
  const theme = stylesheet.slice(stylesheet.indexOf('@layer ds.theme'), stylesheet.indexOf('@layer ds.base'));

  // The base is the page; the palette named after a scheme is what that system gets.
  assert.match(theme, /:root \{[^}]*--ds-bg: #fbfbfa;/, 'the base palette is not the page');
  assert.match(
    theme,
    /@media \(prefers-color-scheme: dark\) \{\s*:root:not\(\[data-theme\]\) \{[^}]*--ds-bg: #0b0c0e;/,
    'a dark system does not get the dark palette',
  );
  assert.match(theme, /:root\[data-theme="dark"\] \{[^}]*--ds-bg: #0b0c0e;/, 'the dark palette cannot be chosen by name');
  // Choosing the base is the absence of a rule, so it is never emitted a second time.
  assert.ok(!theme.includes('data-theme="default"'), 'the base palette was written twice');

  /*
   * A palette whose name is not a color scheme is offered and never automatic, and
   * ships what it declares and no more — the eight roles it leaves alone are the
   * base's, which is the cascade doing the work no build step has to.
   */
  const warm = theme.match(/:root\[data-theme="warm-paper"\] \{([^}]*)\}/)[1];

  assert.ok(!theme.includes('prefers-color-scheme: light'), 'a palette nobody asked for answers a system preference');
  assert.ok(!warm.includes('--ds-text:'), 'a partial palette was expanded into a full one');
  assert.match(warm, /--ds-bg: #f5efe4;/);

  /*
   * `--ds-theme-label` and `--ds-theme-icon` are how a palette talks to the build. The
   * build answers by reading them and not passing them on: no browser reads them, and
   * a palette that follows a scheme would otherwise ship them to every reader twice.
   */
  assert.ok(!/--ds-theme-(label|icon)/.test(theme), 'build-time metadata was shipped as a custom property');
  assert.ok(theme.includes('color-scheme: light') && theme.includes('color-scheme: dark'), 'a palette lost its scheme');
});

test('all assets ship with nested dependencies; direct-reference diagnostics never omit files', async () => {
  const source = mkdtempSync(join(tmpdir(), 'ds-assets-'));

  try {
    writeFileSync(join(source, 'theme.css'), readFileSync(join(SITE, 'theme.css'), 'utf8'));
    mkdirSync(join(source, 'assets/icons'), { recursive: true });

    for (const file of ['icons/icon-48.png', 'icons/icon-master.png', 'icons/LICENSE.txt', 'icons/.DS_Store']) {
      writeFileSync(join(source, 'assets', file), 'x');
    }
    mkdirSync(join(source, 'blocks'));
    writeFileSync(join(source, 'blocks/art.css'), '.art { background-image: url(../assets/icons/art.svg); }');
    writeFileSync(join(source, 'assets/icons/art.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><use href="../symbols.svg#mark"/></svg>');
    writeFileSync(join(source, 'assets/symbols.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><symbol id="mark"><path d="M0 0h1v1z"/></symbol></svg>');

    const result = await buildSite({
      root: source,
      site: { ...site, theme: null, brand: { ...site.brand, favicon: 'assets/icons/icon-48.png' } },
      pages,
      out: join(source, 'dist'),
    });

    assert.ok(existsSync(join(source, 'dist/assets/icons/icon-48.png')), 'a referenced asset was left behind');
    assert.ok(existsSync(join(source, 'dist/assets/icons/LICENSE.txt')), 'the license has to travel with the files');
    assert.ok(existsSync(join(source, 'dist/assets/icons/icon-master.png')), 'a diagnostic must not omit an asset');
    assert.ok(existsSync(join(source, 'dist/assets/icons/art.svg')));
    assert.ok(existsSync(join(source, 'dist/assets/symbols.svg')), 'the nested SVG dependency was omitted');
    assert.ok(!existsSync(join(source, 'dist/assets/icons/.DS_Store')));
    assert.deepEqual(result.unreferencedAssets, ['assets/icons/icon-master.png', 'assets/symbols.svg']);
  } finally {
    removeBuildLocks(join(source, 'dist'));
    rmSync(source, { recursive: true, force: true });
  }
});

test('a file name that cannot be a selector fails the build, not only the lint', async () => {
  const odd = mkdtempSync(join(tmpdir(), 'ds-odd-name-'));

  try {
    writeFileSync(join(odd, 'theme.css'), readFileSync(join(SITE, 'theme.css'), 'utf8'));
    mkdirSync(join(odd, 'themes'));
    /* A name that would close the attribute selector it is about to be written into. */
    writeFileSync(join(odd, 'themes', 'a"] { } :root[x="b.css'), ':root {\n  color-scheme: dark;\n  --ds-bg: #0b0c0e;\n}\n');

    await assert.rejects(
      buildSite({ root: odd, site, pages, out: join(odd, 'dist') }),
      /cannot be a palette name/,
      'a selector was written out of a file name the lint would have refused',
    );
  } finally {
    removeBuildLocks(join(odd, 'dist'));
    rmSync(odd, { recursive: true, force: true });
  }
});

test('a stored theme is applied in the head, before anything is painted', async () => {
  const markup = read('index.html');
  const head = markup.slice(0, markup.indexOf('</head>'));

  assert.ok(head.includes('localStorage.getItem("ds-theme")'), 'the stored choice is not read before the first paint');
  assert.ok(head.includes('setAttribute("data-theme"'), 'the stored choice reaches nothing');
  assert.ok(markup.includes('data-theme-toggle'), 'the configured control is missing from the static page');
  assert.ok(read(built.jsHref).includes('data-theme-option'), 'the theme runtime is not in the bundle');

  const unthemed = mkdtempSync(join(tmpdir(), 'ds-unthemed-'));

  try {
    await buildSite({ root: SITE, site: { ...site, theme: null }, pages, out: unthemed });
    const page = readFileSync(join(unthemed, 'index.html'), 'utf8');

    assert.ok(!page.includes('ds-theme'), 'a site that offers no choice still paid for the control');
  } finally {
    removeBuildLocks(unthemed);
    rmSync(unthemed, { recursive: true, force: true });
  }
});

test('a control with nothing to switch to fails the build instead of rendering', async () => {
  const single = mkdtempSync(join(tmpdir(), 'ds-one-palette-'));

  try {
    // The site's own base palette, and no themes/ beside it.
    writeFileSync(join(single, 'theme.css'), readFileSync(join(SITE, 'theme.css'), 'utf8'));

    await assert.rejects(
      buildSite({ root: single, site, pages, out: join(single, 'dist') }),
      /theme\.toggle is on, but the site has one palette/,
    );
  } finally {
    rmSync(single, { recursive: true, force: true });
  }
});

test('browser scripts retain their source comments', () => {
  assert.ok(read(built.jsHref).includes('Mobile navigation and the optional scroll-away header'));
});

test('a site block uses the normal static page and asset pipeline', () => {
  const markup = read('index.html');
  const stylesheet = read(`styles/${built.cssName}`);

  assert.ok(markup.includes('data-fixture-block'), 'the block renderer did not reach the static HTML');
  assert.ok(stylesheet.includes('.fixture-sample'), 'the block stylesheet missed the site bundle');
  assert.ok(stylesheet.includes('var(--ds-space-sm)'), 'the bundled block cannot read design-system tokens');
});

test('the fixture source and temporary production output pass the full lint', () => {
  assert.deepEqual(lint(SITE, { dist: out }), []);
  assert.deepEqual(skipped, [], 'the lint skipped a production-output check');
});

test('the build ships no default fonts or Finder leftovers', () => {
  assert.ok(!existsSync(join(out, 'fonts')), 'the library copied a font directory');
  assert.doesNotMatch(read(`styles/${built.cssName}`), /@font-face|IBMPlexSans|IBM Plex/);

  const walk = (directory) =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? walk(join(directory, entry.name)) : entry.name,
    );

  assert.ok(!walk(out).includes('.DS_Store'));
});

test('SEO discovery files follow the configured public URL', async () => {
  const seoOut = mkdtempSync(join(tmpdir(), 'ds-seo-'));

  try {
    await buildSite({ root: SITE, site: { ...site, url: 'https://fixture.example/' }, pages, out: seoOut });
    const home = readFileSync(join(seoOut, 'index.html'), 'utf8');
    const robots = readFileSync(join(seoOut, 'robots.txt'), 'utf8');
    const sitemap = readFileSync(join(seoOut, 'sitemap.xml'), 'utf8');

    assert.match(home, /<link rel="canonical" href="https:\/\/fixture\.example\/">/);
    assert.match(home, /<meta property="og:url" content="https:\/\/fixture\.example\/">/);
    assert.equal(robots, 'User-agent: *\nAllow: /\nSitemap: https://fixture.example/sitemap.xml\n');

    for (const url of ['https://fixture.example/', 'https://fixture.example/support.html']) {
      assert.ok(sitemap.includes(`<loc>${url}</loc>`), `${url} is missing from sitemap.xml`);
    }
  } finally {
    removeBuildLocks(seoOut);
    rmSync(seoOut, { recursive: true, force: true });
  }
});

test('an index page in a subdirectory is canonical and listed at its directory', async () => {
  const nestedOut = mkdtempSync(join(tmpdir(), 'ds-nested-index-'));
  const nested = { ...pages[0], id: 'docs', path: 'docs/index.html' };

  try {
    await buildSite({ root: SITE, site: { ...site, url: 'https://fixture.example/' }, pages: [...pages, nested], out: nestedOut });
    const docs = readFileSync(join(nestedOut, 'docs/index.html'), 'utf8');
    const sitemap = readFileSync(join(nestedOut, 'sitemap.xml'), 'utf8');

    assert.match(docs, /<link rel="canonical" href="https:\/\/fixture\.example\/docs\/">/);
    assert.match(docs, /<meta property="og:url" content="https:\/\/fixture\.example\/docs\/">/);
    assert.ok(sitemap.includes('<loc>https://fixture.example/docs/</loc>'), 'docs/index.html is not listed at its directory URL');
    assert.ok(!sitemap.includes('index.html'), 'an index page was listed under its file name');

    for (const url of ['https://fixture.example/', 'https://fixture.example/support.html']) {
      assert.ok(sitemap.includes(`<loc>${url}</loc>`), `${url} is missing from sitemap.xml`);
    }
  } finally {
    removeBuildLocks(nestedOut);
    rmSync(nestedOut, { recursive: true, force: true });
  }
});

test('the notFound page is built unlisted, unindexed, and readable at any depth', async () => {
  const errorOut = mkdtempSync(join(tmpdir(), 'ds-not-found-'));
  const notFound = { ...pages[0], id: 'not-found', path: '404.html', notFound: true };

  try {
    await buildSite({ root: SITE, site: { ...site, url: 'https://fixture.example/' }, pages: [...pages, notFound], out: errorOut });
    const sitemap = readFileSync(join(errorOut, 'sitemap.xml'), 'utf8');
    const errorPage = readFileSync(join(errorOut, '404.html'), 'utf8');
    const home = readFileSync(join(errorOut, 'index.html'), 'utf8');

    assert.ok(!sitemap.includes('404.html'), 'the error page was offered for indexing');
    assert.ok(sitemap.includes('<loc>https://fixture.example/</loc>'), 'the default dropped an ordinary page');

    assert.match(errorPage, /<meta name="robots" content="noindex">/);
    assert.doesNotMatch(errorPage, /rel="canonical"|property="og:url"/, 'a page served at any address has no canonical one');

    assert.match(errorPage, /<link rel="stylesheet" href="\/styles\/site\.[0-9a-f]{8}\.css">/, 'served at /a/b, a relative stylesheet would be looked for under /a/');
    assert.doesNotMatch(errorPage, /\s(?:href|src)="(?![#/]|[a-z][a-z0-9+.-]*:)/i, 'a relative link survived on the error page');
    assert.match(errorPage, /href="#main"/, 'the skip link has to stay a fragment of the page it is on');

    assert.match(home, /<link rel="stylesheet" href="styles\//, 'ordinary pages keep relative links');
    assert.doesNotMatch(home, /name="robots"/);
  } finally {
    removeBuildLocks(errorOut);
    rmSync(errorOut, { recursive: true, force: true });
  }
});

test('fromSiteRoot resolves against where the file sits and leaves the rest alone', () => {
  const html = [
    '<a href="index.html#features">',
    '<a href="#main">',
    '<a href="mailto:a@example.com">',
    '<a href="https://example.com/x">',
    '<img src="assets/a.png" srcset="assets/a-1200.webp 1200w, assets/a.webp 2400w">',
  ].join('');

  assert.equal(
    fromSiteRoot(html, { root: '/', path: '404.html' }),
    [
      '<a href="/index.html#features">',
      '<a href="#main">',
      '<a href="mailto:a@example.com">',
      '<a href="https://example.com/x">',
      '<img src="/assets/a.png" srcset="/assets/a-1200.webp 1200w, /assets/a.webp 2400w">',
    ].join(''),
  );

  assert.equal(
    fromSiteRoot('<a href="../index.html">', { root: '/app/', path: 'errors/404.html' }),
    '<a href="/app/index.html">',
    'a site under a subdirectory, with its error page one level down',
  );
});

test('404 srcset rewriting preserves commas inside CDN and data URLs', () => {
  const urls = [
    'https://cdn.example/image/width=640,quality=80/photo.webp 640w',
    'data:image/png;base64,AAAA 1x',
    'assets/photo,wide.webp 1280w',
    'assets/photo.webp, assets/large.webp 2x',
  ];
  const expected = [
    urls[0], urls[1], '/assets/photo,wide.webp 1280w',
    '/assets/photo.webp, /assets/large.webp 2x',
  ];
  for (let i = 0; i < urls.length; i++) {
    assert.equal(fromSiteRoot(`<img srcset="${urls[i]}">`, { root: '/', path: '404.html' }), `<img srcset="${expected[i]}">`);
  }
  assert.equal(
    fromSiteRoot('<img srcset="assets/a.webp 1x,assets/b.webp 2x">', { root: '/', path: '404.html' }),
    '<img srcset="/assets/a.webp 1x, /assets/b.webp 2x">',
  );
});

test('404 rewriting handles HTML attribute quoting, whitespace and case in rendered inline markup', async (t) => {
  const errorOut = mkdtempSync(join(tmpdir(), 'ds-404-attributes-'));
  t.after(() => { removeBuildLocks(errorOut); rmSync(errorOut, { recursive: true, force: true }); });
  const note = [
    "<a href='support.html'>Single quotes</a>",
    '<a HREF = support.html>Unquoted</a>',
    "<img SRC = 'assets/photo.webp' SRCSET = 'https://cdn.example/width=640,quality=80/photo.webp 640w, assets/photo,wide.webp 1280w'>",
    '<img src=assets/photo.webp srcset=assets/photo.webp>',
  ].join(' ');
  await buildSite({ root: SITE, site: { ...site, url: 'https://fixture.example/app/' }, pages: [{
    ...pages[0], id: 'not-found', path: '404.html', notFound: true,
    render: () => [cta({ title: 'Missing page', note })],
  }], out: errorOut });
  const html = readFileSync(join(errorOut, '404.html'), 'utf8');
  assert.ok(html.includes("href='/app/support.html'"));
  assert.ok(html.includes('HREF = "/app/support.html"'));
  assert.ok(html.includes("SRC = '/app/assets/photo.webp'"));
  assert.ok(html.includes("SRCSET = 'https://cdn.example/width=640,quality=80/photo.webp 640w, /app/assets/photo,wide.webp 1280w'"));
  assert.ok(html.includes('src="/app/assets/photo.webp" srcset="/app/assets/photo.webp"'));
});

test('nested pages resolve the shared bundles at the site root, including a nested 404 under a subdirectory', async (t) => {
  const nestedOut = mkdtempSync(join(tmpdir(), 'ds-nested-bundles-'));
  t.after(() => { removeBuildLocks(nestedOut); rmSync(nestedOut, { recursive: true, force: true }); });
  const result = await buildSite({ root: SITE, site: { ...site, url: 'https://fixture.example/app/' }, pages: [
    { ...pages[0], id: 'nested', path: 'guide/topic/index.html' },
    { ...pages[0], id: 'not-found', path: 'errors/404.html', notFound: true },
  ], out: nestedOut });
  for (const [path, servedAt] of [
    ['guide/topic/index.html', 'https://fixture.example/app/guide/topic/index.html'],
    ['errors/404.html', 'https://fixture.example/app/missing/deep/page'],
  ]) {
    const html = readFileSync(join(nestedOut, path), 'utf8');
    const css = html.match(/<link rel="stylesheet" href="([^"]+)"/)[1];
    const script = html.match(/<script src="([^"]+)"/)[1];
    assert.equal(new URL(css, servedAt).pathname, `/app/styles/${result.cssName}`);
    assert.equal(new URL(script, servedAt).pathname, `/app/${result.jsHref}`);
    assert.ok(existsSync(join(nestedOut, 'styles', result.cssName)));
    assert.ok(existsSync(join(nestedOut, result.jsHref)));
  }
  assert.match(readFileSync(join(nestedOut, 'guide/topic/index.html'), 'utf8'), /href="\.\.\/\.\.\/styles\//);
  assert.match(readFileSync(join(nestedOut, 'errors/404.html'), 'utf8'), /href="\/app\/styles\//);
});

test('shared URLs resolve from the site root on root, nested and fallback pages', async (t) => {
  const output = mkdtempSync(join(tmpdir(), 'ds-shared-urls-'));
  t.after(() => { removeBuildLocks(output); rmSync(output, { recursive: true, force: true }); });
  const body = '<a href="sibling.html">Sibling</a><a href="../parent.html">Parent</a>';
  const config = { ...site,
    brand: { ...site.brand, logo: 'assets/logo.svg', favicon: 'assets/icon.svg', appleTouchIcon: 'assets/touch.png' },
    nav: { ...site.nav, links: [...site.nav.links, { label: 'External', href: 'https://example.test/' }, { label: 'Anchor', href: '#main' }] },
    footer: { ...site.footer, groups: [{ title: 'Help', links: [{ label: 'Support', href: 'support.html' }, { label: 'Help', href: 'support.html?from=footer&lang=en#help' }] }] },
  };
  for (const base of ['https://example.test/', 'https://example.test/app/']) {
    await buildSite({ root: SITE, site: { ...config, url: base }, out: output, pages: [
      { ...pages[0], render: () => [raw(body)] },
      { ...pages[0], id: 'nested', path: 'guide/topic/index.html', render: () => [raw(body)] },
      { ...pages[0], id: 'missing', path: 'errors/404.html', notFound: true, render: () => [raw(body)] },
    ] });
    for (const [path, servedAt] of [['index.html', base], ['guide/topic/index.html', `${base}guide/topic/index.html`], ['errors/404.html', `${base}unknown/deep/path`]]) {
      const html = readFileSync(join(output, path), 'utf8');
      const brand = html.match(/<a class="ds-brand[^>]*href="([^"]+)"/)[1];
      assert.equal(new URL(brand, servedAt).href, `${base}index.html`);
      for (const asset of ['logo.svg', 'icon.svg', 'touch.png']) {
        const value = html.match(new RegExp(`(?:src|href)="([^"]*assets/${asset.replace('.', '\\.')})"`))[1];
        assert.equal(new URL(value, servedAt).href, `${base}assets/${asset}`);
      }
      const support = [...html.matchAll(/href="([^"]*support\.html[^"]*)"/g)].map(([, value]) => value);
      assert.equal(support.length, 3);
      for (const value of support) assert.equal(new URL(value.replaceAll('&amp;', '&'), servedAt).pathname, new URL(`${base}support.html`).pathname);
      assert.ok(html.includes('href="https://example.test/"'));
      assert.ok(html.includes('href="#main"'));
      if (!path.startsWith('errors/')) assert.ok(html.includes(body), 'page-owned content must stay page-relative');
    }
  }
});

test('a site can declare only one notFound page', () => {
  const render = () => [];
  const page = (id) => ({ id, path: `${id}.html`, meta: { title: 't', description: 'd' }, render, notFound: true });

  assert.throws(() => sitePages([page('gone'), page('missing')]), /gone, missing are all marked notFound/);
});

test('a pre-launch build does not invent public discovery files', async () => {
  const prelaunchOut = mkdtempSync(join(tmpdir(), 'ds-prelaunch-'));

  try {
    await buildSite({ root: SITE, site: { ...site, url: '' }, pages, out: prelaunchOut });
    assert.ok(!existsSync(join(prelaunchOut, 'robots.txt')));
    assert.ok(!existsSync(join(prelaunchOut, 'sitemap.xml')));
  } finally {
    removeBuildLocks(prelaunchOut);
    rmSync(prelaunchOut, { recursive: true, force: true });
  }
});

test('no page renders a dead App Store button while the link is still null', () => {
  assert.equal(site.appStore.href, null, 'this assertion is about the pre-launch state');

  for (const page of pages) {
    assert.ok(!read(page.path).includes(site.appStore.label), `${page.path} rendered a dead download button`);
  }
});

test('page contracts fail before replacing the last successful build', async () => {
  const guardedOut = mkdtempSync(join(tmpdir(), 'ds-guarded-build-'));
  const marker = join(guardedOut, 'last-good.html');
  writeFileSync(marker, 'keep me');

  try {
    await assert.rejects(
      buildSite({
        root: SITE,
        site,
        pages: [{ id: 'escape', path: '../../escape.html', meta: { title: 'x', description: 'x' }, render: () => [] }],
        out: guardedOut,
      }),
      /relative \.html path below dist/,
    );
    assert.equal(readFileSync(marker, 'utf8'), 'keep me');

    await assert.rejects(
      buildSite({
        root: SITE,
        site: { ...site, fonts: { display: { family: 'Missing', fallback: 'serif', files: [{ weight: 700, path: 'assets/missing.woff2' }] } } },
        pages,
        out: guardedOut,
      }),
      /names "assets\/missing\.woff2", which is not in the site/,
    );
    assert.deepEqual(readdirSync(guardedOut), ['last-good.html'], 'font validation changed the previous output');
    assert.equal(readFileSync(marker, 'utf8'), 'keep me');

    await assert.rejects(
      buildSite({
        root: SITE,
        site,
        pages: [{ id: 'empty', path: 'empty.html', meta: { title: 'x', description: 'x' }, render: () => [] }],
        out: guardedOut,
      }),
      /page must put something inside <main>/,
    );
    assert.equal(readFileSync(marker, 'utf8'), 'keep me');

    await assert.rejects(
      buildSite({ root: SITE, site: { ...site, runtime: [...site.runtime, 'typo'] }, pages, out: guardedOut }),
      /runtime module "typo" does not exist/,
    );
    assert.equal(readFileSync(marker, 'utf8'), 'keep me');
  } finally {
    removeBuildLocks(guardedOut);
    rmSync(guardedOut, { recursive: true, force: true });
  }
});

test('successful rebuilds replace obsolete pages, assets, discovery files and hashed bundles', async () => {
  const kept = mkdtempSync(join(tmpdir(), 'ds-kept-build-'));

  try {
    await buildSite({ root: SITE, site: { ...site, url: 'https://example.test/' }, pages: [...pages, { ...pages[0], id: 'old', path: 'old.html' }], out: kept });
    writeFileSync(join(kept, 'keep.txt'), 'obsolete manual output');
    mkdirSync(join(kept, 'assets'), { recursive: true });
    writeFileSync(join(kept, 'assets/deleted.svg'), 'obsolete asset');
    writeFileSync(join(kept, 'scripts/site.00000000.js'), 'obsolete bundle');
    await buildSite({ root: SITE, site, pages, out: kept });
    for (const file of ['old.html', 'keep.txt', 'assets/deleted.svg', 'scripts/site.00000000.js', 'sitemap.xml', 'robots.txt']) {
      assert.ok(!existsSync(join(kept, file)), `${file} survived a successful rebuild`);
    }
    assert.ok(existsSync(join(kept, 'index.html')));
    assert.ok(existsSync(join(kept, 'support.html')));
  } finally {
    removeBuildLocks(kept);
    rmSync(kept, { recursive: true, force: true });
  }
});

test('a late asset-copy failure preserves the previous generation and cleans staging', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'ds-failed-generation-'));
  t.after(() => { removeBuildLocks(join(root, 'dist')); rmSync(root, { recursive: true, force: true }); });
  writeFileSync(join(root, 'theme.css'), readFileSync(join(SITE, 'theme.css')));
  const config = { ...site, theme: null };
  const destination = join(root, 'dist');
  await buildSite({ root, site: config, pages, out: destination });
  const previous = readFileSync(join(destination, 'index.html'), 'utf8');
  mkdirSync(join(root, 'assets'));
  writeFileSync(join(root, 'assets/collision.html'), 'asset file');
  await assert.rejects(buildSite({ root, site: config, pages: [{ ...pages[0], path: 'assets/collision.html/nested.html' }], out: destination }));
  assert.equal(readFileSync(join(destination, 'index.html'), 'utf8'), previous);
  assert.ok(!existsSync(join(destination, 'assets')));
  assert.ok(readdirSync(root).every((name) => !name.startsWith('.dist-build-')));
});

test('replacing output cannot remove site sources or recurse into copied assets', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'ds-output-boundary-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = join(root, 'keep.txt');
  writeFileSync(source, 'source');
  for (const destination of [root, join(root, '..'), ...['assets', 'blocks', 'content', 'themes', 'node_modules', '.git'].map((name) => join(root, name, 'dist'))]) {
    await assert.rejects(buildSite({ root, site, pages, out: destination }), /dedicated directory/);
    assert.equal(readFileSync(source, 'utf8'), 'source');
  }
});

test('a populated directory or symlink without build ownership is never replaced', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'ds-unowned-output-'));
  t.after(() => { removeBuildLocks(...['data', 'alias', 'theme.css'].map((name) => join(root, name))); rmSync(root, { recursive: true, force: true }); });
  writeFileSync(join(root, 'theme.css'), readFileSync(join(SITE, 'theme.css')));
  mkdirSync(join(root, 'data'));
  writeFileSync(join(root, 'data/source.js'), 'export const content = "keep";');
  symlinkSync(join(root, 'data'), join(root, 'alias'), 'dir');
  for (const destination of ['data', 'alias', 'theme.css']) {
    await assert.rejects(buildSite({ root, site: { ...site, theme: null }, pages, out: join(root, destination) }), /empty or JamShoot-owned/);
    assert.equal(readFileSync(join(root, 'data/source.js'), 'utf8'), 'export const content = "keep";');
    assert.ok(readFileSync(join(root, 'theme.css'), 'utf8').includes('--ds-bg'));
  }
});

test('builds preserve comments and comment-like data without changing script semantics', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'ds-preserved-comments-'));
  t.after(() => { removeBuildLocks(join(root, 'dist')); rmSync(root, { recursive: true, force: true }); });
  writeFileSync(join(root, 'theme.css'), readFileSync(join(SITE, 'theme.css')));
  mkdirSync(join(root, 'blocks'));
  mkdirSync(join(root, 'assets'));
  const scene = '// site comment\nif (true) {} /[//]/.test("/");\nglobalThis.sceneReady = true;\n(() => { globalThis.effects = ["scene"]; })()';
  writeFileSync(join(root, 'blocks/scene.client.js'), scene);
  writeFileSync(join(root, 'blocks/tail.client.js'), '(() => { globalThis.effects.push("tail"); })()');
  writeFileSync(join(root, 'blocks/scene.css'), '/* style comment */ .scene { display: block; }');
  const assets = {
    'module.mjs': '/* asset comment */ export const value = "/* data */";',
    'drawing.svg': '<svg><!-- asset comment --><![CDATA[<!-- data -->]]></svg>',
    'data.xml': '<!-- XML comment --><data/>',
    'extra.css': '/* CSS comment */ .extra { display: block; }',
    'extra.html': '<!-- HTML comment --><textarea><!-- data --></textarea>',
  };
  for (const [name, content] of Object.entries(assets)) writeFileSync(join(root, 'assets', name), content);
  const body = '<!-- page comment --><textarea><!-- data --></textarea><script>window.sample = "<!-- data -->";</script>';
  const result = await buildSite({ root, site: { ...site, theme: null }, pages: [{ ...pages[0], render: () => [raw(body)] }] });
  assert.ok(readFileSync(join(result.out, 'index.html'), 'utf8').includes(body));
  const script = readFileSync(join(result.out, result.jsHref), 'utf8');
  assert.ok(script.includes(scene));
  const context = { document: { querySelector: () => null } };
  runInNewContext(script, context);
  assert.equal(context.sceneReady, true);
  assert.deepEqual(Array.from(context.effects), ['scene', 'tail'], 'adjacent scripts must not become one chained expression');
  assert.ok(result.jsHref.includes(createHash('sha256').update(script).digest('hex').slice(0, 8)));
  assert.ok(readFileSync(join(result.out, 'styles', result.cssName), 'utf8').includes('/* style comment */'));
  for (const [name, content] of Object.entries(assets)) assert.equal(readFileSync(join(result.out, 'assets', name), 'utf8'), content);
});

test('concurrent builds targeting one directory run in order without leftover backups', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'ds-concurrent-builds-'));
  t.after(() => { removeBuildLocks(join(directory, 'dist')); rmSync(directory, { recursive: true, force: true }); });
  const destination = join(directory, 'dist');
  const requests = Array.from({ length: 8 }, (_, index) => buildSite({ root: SITE,
    site: { ...site, brand: { name: `Generation ${index}` } }, pages, out: destination }));
  const results = await Promise.allSettled(requests);
  assert.ok(results.every((entry) => entry.status === 'fulfilled'), 'concurrent requests must all complete');
  assert.ok(readFileSync(join(destination, 'index.html'), 'utf8').includes('Generation 7'));
  assert.deepEqual(readdirSync(directory), ['dist']);
  const failed = buildSite({ root: SITE, site: { ...site, runtime: [...site.runtime, 'missing'] }, pages, out: destination });
  const recovered = buildSite({ root: SITE, site, pages, out: destination });
  const [failure, recovery] = await Promise.allSettled([failed, recovered]);
  assert.equal(failure.status, 'rejected');
  assert.match(failure.reason.message, /runtime module "missing"/);
  assert.equal(recovery.status, 'fulfilled');
  assert.deepEqual(readdirSync(directory), ['dist']);
});

test('a separate process lock prevents replacing output and leaves no staging behind', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'ds-build-lock-'));
  t.after(() => { removeBuildLocks(join(directory, 'dist')); rmSync(directory, { recursive: true, force: true }); });
  const destination = join(directory, 'dist');
  await buildSite({ root: SITE, site, pages, out: destination });
  const previous = readFileSync(join(destination, 'index.html'), 'utf8');
  const release = await acquireBuildLock(resolve(destination));
  try {
    await assert.rejects(buildSite({ root: SITE, site, pages, out: destination }), /is locked by build process \d+/);
    assert.equal(readFileSync(join(destination, 'index.html'), 'utf8'), previous);
    assert.deepEqual(readdirSync(directory), ['dist']);
  } finally { await release(); }
  await buildSite({ root: SITE, site, pages, out: destination });
  assert.deepEqual(readdirSync(directory), ['dist']);
});

test('site-specific parallax is not a library runtime and client blocks still bundle automatically', async () => {
  await assert.rejects(buildSite({ root: SITE, site: { ...site, runtime: [...site.runtime, 'parallax'] }, pages, out }), /runtime module "parallax" does not exist/);
  assert.doesNotMatch(read(built.jsHref), /dsParallax/);
  assert.match(read(built.jsHref), /clientReady/);
});

test('a site face becomes one @font-face per file and its role token', () => {
  const css = fontCss({
    display: {
      family: 'Libre Baskerville',
      fallback: 'Georgia, serif',
      files: [{ weight: 700, path: 'assets/fonts/LibreBaskerville-700.woff2' }],
    },
  });

  assert.match(css, /font-family: "Libre Baskerville";/);
  assert.match(css, /src: url\("\.\.\/assets\/fonts\/LibreBaskerville-700\.woff2"\) format\("woff2"\);/);
  assert.match(css, /font-weight: 700;/);
  assert.match(css, /--ds-font-display: "Libre Baskerville", Georgia, serif;/);
  assert.doesNotMatch(css, /--ds-font-sans/);
  assert.equal(fontCss(undefined), '');
});

test('a site face is refused off the weight scale, as anything but woff2, or missing', () => {
  const config = (file) => ({
    ...site,
    fonts: { display: { family: 'Face', fallback: 'serif', files: [file] } },
  });

  assert.throws(() => siteConfig(config({ weight: 650, path: 'assets/face.woff2' })), /weight 650 is not on the scale/);
  assert.throws(() => siteConfig(config({ weight: 700, path: 'assets/face.ttf' })), /is not a \.woff2 file/);
  for (const path of ['display.woff2', '../display.woff2', 'assets/../display.woff2', 'assets/./face.woff2', 'assets/a\\face.woff2', 'assets/a%2fb.woff2', 'assets/a?b.woff2', 'assets/a#b.woff2']) {
    assert.throws(() => siteConfig(config({ weight: 700, path })), /normalized local path under assets/);
  }
  assert.throws(
    () => fontCss(config({ weight: 700, path: 'assets/nowhere.woff2' }).fonts, SITE),
    /names "assets\/nowhere\.woff2", which is not in the site/,
  );
});

test('declared site fonts ship at the URL emitted in CSS', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'ds-site-font-'));
  t.after(() => { removeBuildLocks(join(root, 'dist')); rmSync(root, { recursive: true, force: true }); });
  writeFileSync(join(root, 'theme.css'), readFileSync(join(SITE, 'theme.css')));
  mkdirSync(join(root, 'assets/fonts'), { recursive: true });
  const font = 'assets/fonts/display.woff2';
  writeFileSync(join(root, font), 'font bytes');
  const result = await buildSite({ root, site: { ...site, theme: null, fonts: {
    display: { family: 'Display', fallback: 'serif', files: [{ weight: 700, path: font }] },
  } }, pages });
  assert.match(readFileSync(join(result.out, 'styles', result.cssName), 'utf8'), /url\("\.\.\/assets\/fonts\/display\.woff2"\)/);
  assert.equal(readFileSync(join(result.out, font), 'utf8'), 'font bytes');
});
