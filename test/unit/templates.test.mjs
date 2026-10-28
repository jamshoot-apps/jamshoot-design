import assert from 'node:assert/strict';
import { test } from 'node:test';
import { page, publicPath } from '../../src/templates.js';
import { siteConfig, sitePages } from '../../src/config.js';
import { site } from '../fixtures/site/site.config.js';
import { pages } from '../fixtures/site/pages.js';

test('publicPath serves an index file at its directory and leaves other paths alone', () => {
  assert.equal(publicPath('index.html'), '');
  assert.equal(publicPath('docs/index.html'), 'docs/');
  assert.equal(publicPath('docs/deep/index.html'), 'docs/deep/');
  assert.equal(publicPath('support.html'), 'support.html');
  assert.equal(publicPath('docs/support.html'), 'docs/support.html');
  assert.equal(publicPath('docs/myindex.html'), 'docs/myindex.html');
});

test('canonical and og:url follow publicPath, and the notFound page has neither', () => {
  const config = siteConfig({ ...site, url: 'https://example.com/' });
  const render = (path, extra = {}) => {
    const pageConfig = sitePages([{ ...pages[0], path, ...extra }])[0];
    return String(page({ site: config, page: pageConfig, sections: [], cssHref: 'styles.css', jsHref: null }));
  };
  const canonical = (html) => html.match(/<link rel="canonical" href="([^"]*)">/)?.[1] ?? null;
  const ogUrl = (html) => html.match(/<meta property="og:url" content="([^"]*)">/)?.[1] ?? null;

  for (const [path, url] of [
    ['index.html', 'https://example.com/'],
    ['docs/index.html', 'https://example.com/docs/'],
    ['support.html', 'https://example.com/support.html'],
    ['docs/support.html', 'https://example.com/docs/support.html'],
  ]) {
    const html = render(path);
    assert.equal(canonical(html), url, `${path} canonical`);
    assert.equal(ogUrl(html), url, `${path} og:url`);
  }

  const notFound = render('404.html', { notFound: true });
  assert.equal(canonical(notFound), null);
  assert.equal(ogUrl(notFound), null);
});

test('site and page JSON-LD preserve data without terminating their script elements', () => {
  const siteData = { name: '</script><p>Example</p>', nested: { value: '<!-- & " \\ end' } };
  const pageData = [{ name: '</ScRiPt><script>Example</script>', value: '\u2028\u2029' }];
  const config = siteConfig({ ...site, jsonLd: siteData });
  const pageConfig = sitePages([{ ...pages[0], jsonLd: pageData }])[0];
  const html = String(page({ site: config, page: pageConfig, sections: [], cssHref: 'styles.css', jsHref: null }));
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(([, json]) => json);
  assert.equal(scripts.length, 2);
  assert.ok(scripts.every((json) => !json.includes('<')));
  assert.deepEqual(scripts.map(JSON.parse), [siteData, pageData]);
  assert.doesNotMatch(html, /<p>Example<\/p>|<script>Example<\/script>/);
});
