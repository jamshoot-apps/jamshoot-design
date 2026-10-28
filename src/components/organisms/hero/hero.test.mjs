import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hero } from './hero.js';

test('hero renders validated inline lead markup and escapes its plain title', () => {
  const html = String(hero({ title: '<Example>', lead: 'Read <a href="guide.html">the guide</a> and <em>start</em>.' }));
  assert.match(html, /<h1[^>]*>&lt;Example&gt;<\/h1>/);
  assert.match(html, /<p class="ds-hero__lead">Read <a href="guide.html">the guide<\/a> and <em>start<\/em>\.<\/p>/);
  assert.throws(() => hero({ title: 'Example', lead: '<p>Nested paragraph</p>' }), /inline markup only/);
});
