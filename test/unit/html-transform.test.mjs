import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fromSiteRoot } from '../../src/cli/build.mjs';

test('URL rewriting touches real URL attributes without altering embedded text or attributes', () => {
  const untouched = [
    '<!-- <a href="example.html"> -->',
    '<script>const html = "<a href=example.html>";</script>',
    '<style>.x::before { content: "<a href=example.html>"; }</style>',
    '<textarea><a href="example.html"></textarea>',
    '<svg><![CDATA[<a href="example.html">]]></svg>',
    '<span title="example href=example.html">Text</span>',
  ].join('');
  const source = `${untouched}<a title="x > y" HREF = 'support.html?x=1&amp;y=2#help'>Help</a>`;
  assert.equal(fromSiteRoot(source, { root: '/app/', path: '404.html' }), `${untouched}<a title="x > y" HREF = '/app/support.html?x=1&amp;y=2#help'>Help</a>`);
  assert.equal(fromSiteRoot('<a href="?lang=en">Language</a>', { root: '/app/', path: 'errors/404.html' }), '<a href="?lang=en">Language</a>');
});

test('fallback URLs inside noscript work at a missing address with JavaScript disabled', () => {
  const html = fromSiteRoot('<noscript><a href="support.html">Help</a><img src="assets/offline.svg"></noscript>', { root: '/app/', path: '404.html' });
  const servedAt = 'https://example.test/app/missing/deep/path';
  const href = html.match(/href="([^"]+)"/)[1];
  const src = html.match(/src="([^"]+)"/)[1];
  assert.equal(new URL(href, servedAt).pathname, '/app/support.html');
  assert.equal(new URL(src, servedAt).pathname, '/app/assets/offline.svg');
});
