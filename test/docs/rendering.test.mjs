import assert from 'node:assert/strict';
import { test } from 'node:test';
import { inline, exampleBlocks } from '../../scripts/docs.mjs';
import { renderMarkdown } from '../../scripts/docs/markdown.mjs';
import { resolveDocLink } from '../../scripts/docs/pages.mjs';
import { expand } from '../../scripts/tables.mjs';
import { readFileSync } from 'node:fs';
import { TIER_NAMES, componentsIn } from '../../src/cli/components.js';
import { runExample } from '../../scripts/docs/examples.mjs';
import { LAYERS } from '../../src/tokens/contract.js';

test('component usage examples render with built-in icons only', () => {
  const previous = process.env.JAMSHOOT_ICONS_DIR;
  delete process.env.JAMSHOOT_ICONS_DIR;
  try {
    for (const tier of TIER_NAMES) {
      for (const entry of componentsIn(tier)) {
        for (const code of exampleBlocks(readFileSync(entry.docs, 'utf8'))) {
          assert.doesNotThrow(() => runExample(code), `${entry.docs}: ${code}`);
        }
      }
    }
  } finally {
    if (previous !== undefined) process.env.JAMSHOOT_ICONS_DIR = previous;
  }
});

test('importing docs helpers leaves icon configuration unchanged', async () => {
  const previous = process.env.JAMSHOOT_ICONS_DIR;
  delete process.env.JAMSHOOT_ICONS_DIR;
  try {
    await import('../../scripts/docs.mjs?icon-config');
    assert.equal(process.env.JAMSHOOT_ICONS_DIR, undefined);
  } finally {
    if (previous !== undefined) process.env.JAMSHOOT_ICONS_DIR = previous;
  }
});

test('docs inline code is opaque to bold and link parsing', () => {
  assert.equal(
    inline('`src/styles/**`, **bold**, `[not](a-link)`'),
    '<code>src/styles/**</code>, <strong>bold</strong>, <code>[not](a-link)</code>',
  );
});

test('documentation links render code labels and resolve their destination', () => {
  assert.equal(
    inline('[`brand()`](../../src/components/atoms/brand/README.md) and **[`A & B`](guide.md)**',
      (href) => href === 'guide.md' ? 'guide.html' : 'atoms-brand.html'),
    '<a href="atoms-brand.html"><code>brand()</code></a> and <strong><a href="guide.html"><code>A &amp; B</code></a></strong>',
  );
});

test('the CSS assembly diagram renders current layers and sources as native markup', () => {
  const html = renderMarkdown('Before.\n```diagram css-assembly\n```\nAfter.');
  assert.match(html, /^<p>Before\.<\/p>\n<figure class="css-assembly">/);
  assert.match(html, /<\/figure>\n<p>After\.<\/p>$/);
  const layers = [...html.matchAll(/class="css-assembly__layer">[\s\S]*?<code>([^<]+)<\/code>/g)]
    .map(([, name]) => name);
  assert.deepEqual(layers, LAYERS);
  for (const path of ['src/tokens/reset.css', 'src/tokens/primitives.css', 'site/theme.css',
    'site/themes/*.css', 'src/styles/base.css', 'src/components/layout/**/*.css',
    'src/components/atoms/**/*.css', 'src/components/molecules/**/*.css',
    'src/components/organisms/**/*.css', 'site/blocks/**/*.css']) {
    assert.ok(html.includes(`<code>${path}</code>`), `missing source ${path}`);
  }
  assert.match(html, /site\/dist\/styles\/site\.&lt;hash&gt;\.css/);
  assert.doesNotMatch(html, /<img|<svg|style=/);
  assert.match(renderMarkdown('````md\n```diagram css-assembly\n```\n````'), /^<pre><code>/);
});

test('nested README templates stay literal for rendering, tables and executable examples', () => {
  for (const width of [4, 5]) {
    const outer = '`'.repeat(width);
    const inner = '`'.repeat(width - 1);
    const source = [
      `${outer}markdown`, `${inner}example`, 'notARealComponent()', inner,
      `${inner}options notARealComponent`, inner, outer, '',
      '```example title="Live"', 'realExample()', '```',
    ].join('\n');
    assert.equal(expand(source), source);
    assert.deepEqual(exampleBlocks(source), ['realExample()\n']);
    const calls = [];
    const html = renderMarkdown(expand(source), (code, title) => {
      calls.push({ code, title });
      return '<div>live example</div>';
    });
    assert.deepEqual(calls, [{ code: 'realExample()', title: 'Live' }]);
    assert.ok(html.includes(`<pre><code>${inner}example\nnotARealComponent()`));
    assert.match(html, /<div>live example<\/div>/);
  }
});

test('adjacent Markdown blocks retain text, wrapped list items and escaped table pipes', () => {
  const html = renderMarkdown([
    'A paragraph', 'soft wrapped.', '- first', '  continued', '- second',
    '| Kind |', '| --- |', '| `a\\|b` |', 'After the table.', '## Next',
  ].join('\n'));
  assert.equal(html, [
    '<p>A paragraph soft wrapped.</p>',
    '<ul class="ds-prose__list"><li>first continued</li><li>second</li></ul>',
    '<div class="ds-table-scroll"><table class="ds-table"><thead><tr><th>Kind</th></tr></thead><tbody><tr><td><code>a|b</code></td></tr></tbody></table></div>',
    '<p>After the table.</p>', '<h2 id="next">Next</h2>',
  ].join('\n'));
});

test('generated fences expand once before rendering and support the legacy body argument', () => {
  const html = renderMarkdown(expand('```options\ncard\n```'));
  assert.match(html, /^<div class="generated">/);
  assert.match(html, /<th>Option<\/th>/);
  assert.match(html, /<code>title<\/code>/);
  assert.doesNotMatch(html, /<pre>/);
  assert.equal(expand('```js\n```'), '```js\n```');
  assert.equal(expand('```js\n\n```'), '```js\n\n```');
});

for (const width of [4, 5]) {
  test(`generated tables retain ${width}-backtick fences and render like triple fences`, () => {
    const ticks = '`'.repeat(width);
    const source = [`${ticks}options card`, 'stale placeholder', ticks].join('\n');
    const expanded = expand(source);
    assert.ok(expanded.startsWith(`${ticks}options card\n`));
    assert.ok(expanded.endsWith(`\n${ticks}`));
    assert.doesNotMatch(expanded, /stale placeholder/);
    assert.equal(expand(expanded), expanded);
    assert.equal(expand([`${ticks}options`, 'card', ticks].join('\n')), expanded);
    const html = renderMarkdown(expanded);
    assert.equal(html, renderMarkdown(expand('```options card\n```')));
    assert.match(html, /<th>Option<\/th>/);
    assert.match(html, /<code>title<\/code>/);
  });
}

test('documentation links keep fragments, external URLs and non-page paths', () => {
  const source = '/library/docs/foundations/layout.md';
  const slugs = new Map([['/library/src/components/layout/grid/README.md', 'layout-grid']]);
  assert.equal(resolveDocLink('../../src/components/layout/grid/README.md#usage', source, slugs), 'layout-grid.html#usage');
  for (const href of ['#usage', 'https://example.com/guide.md#usage', '../missing.md', '../../src/tokens/contract.js']) {
    assert.equal(resolveDocLink(href, source, slugs), href);
  }
});
