import { specOf } from '../../../define.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { card } from './card.js';

test('card composes the icon tile and owns its media boundary and proximity spacing', () => {
  const markup = String(card({
    icon: 'flash-outline',
    title: 'Offline',
    body: 'No account or network required.',
    media: 'Preview',
  }));
  const css = readFileSync(new URL('card.css', import.meta.url), 'utf8');
  const figureCss = readFileSync(new URL('../figure/figure.css', import.meta.url), 'utf8');

  assert.match(markup, /class="ds-icon-tile"><svg class="ds-icon/, 'the tile is the atom, not a copy of it');
  assert.doesNotMatch(css, /ds-card__icon/, 'the tile is styled in two places again');
  assert.match(markup, /class="ds-card__media">Preview<\/div>/);
  assert.match(markup, /class="ds-card__copy"><h3[^>]*>Offline<\/h3><p[^>]*>No account/);
  assert.doesNotMatch(markup, /data-ds-card-media/);
  assert.match(css, /\.ds-card__copy\s*\{[^}]*gap:\s*var\(--ds-space-3xs\)/s);
  assert.match(css, /\.ds-card__media\s*\{[^}]*overflow:\s*hidden[^}]*border-radius:/s);
  assert.doesNotMatch(figureCss, /data-ds-card-media|--ds-card-/);
});

/*
 * Both is a contradiction. Neither is a card with a title and an icon and nothing
 * else — a feature grid of short labels.
 */
test('card takes a body or bullets, and is allowed neither', () => {
  assert.match(specOf(card).constraints.map((rule) => rule.describe).join('\n'), /at most one of `body` or `bullets`/);
  assert.throws(() => card({ title: 'A', body: 'b', bullets: ['x'] }), /not both/);
  assert.match(String(card({ icon: 'flash-outline', title: 'Offline' })), /<h3 class="ds-card__title">Offline<\/h3>/);
});

test('card without icon or media starts with its copy', () => {
  assert.match(String(card({ title: 'A', body: 'B' })), /^<div class="ds-card"><div class="ds-card__copy"><h3/);
});
