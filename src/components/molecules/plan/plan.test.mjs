import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { plan } from './plan.js';

test('plans keep the badge beside the name and omit an unused footer action', () => {
  const plain = String(plan({ title: 'Free', price: { amount: '$0' }, features: ['Create a project'] }));
  const featured = String(
    plan({
      title: 'Pro',
      price: { amount: 'One-time', note: 'Paid once' },
      features: ['Export every project'],
      lead: 'Everything in Free, <em>without</em> the limit.',
      badgeLabel: 'Best value',
      link: { label: 'Unlock it inside the app', href: '#download' },
    }),
  );
  const css = readFileSync(new URL('plan.css', import.meta.url), 'utf8');

  assert.match(plain, /^<div class="ds-plan"><header class="ds-plan__head"><h3 class="ds-plan__name">Free<\/h3><\/header>/);
  assert.doesNotMatch(plain, /ds-plan__badge|ds-plan__price-note|ds-plan__lead|ds-plan__action|ds-plan__previous-price/);
  assert.match(featured, /ds-plan__name">Pro<\/h3><div class="ds-plan__badge"><span class="ds-badge/);
  assert.match(featured, /ds-plan__price-note">Paid once<\/p>/);
  assert.match(featured, /ds-plan__lead">Everything in Free, <em>without<\/em> the limit\.<\/p>/);
  assert.match(featured, /<a class="ds-plan__action" href="#download">Unlock it inside the app/);
  assert.match(css, /\.ds-plan__head\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto;/s);
  assert.match(css, /\.ds-plan__head\s*\{[^}]*grid-template-rows:\s*var\(--ds-space-xl\);/s);
  assert.match(css, /\.ds-plan\s*\{[^}]*gap:\s*var\(--ds-space-lg\);/s);
  assert.match(css, /\.ds-plan__price-group\s*\{[^}]*gap:\s*var\(--ds-space-3xs\);/s);
  assert.match(css, /\.ds-plan__price\s*\{[^}]*line-height:\s*var\(--ds-leading-tight\);/s);
  assert.match(css, /\.ds-plan__price-note\s*\{[^}]*line-height:\s*var\(--ds-leading-snug\);/s);
});

test('discounted plans distinguish the former price with an accessible, translatable label', () => {
  const discounted = String(plan({
    title: 'Pro', price: { amount: '$9.99', previous: '$14.99' }, features: ['Create projects without limits'],
  }));
  assert.match(discounted, /ds-plan__price">\$9\.99<\/p><s class="ds-plan__previous-price"><span class="ds-visually-hidden">Previous price: <\/span>\$14\.99<\/s>/);

  const translated = String(plan({
    title: 'Pro',
    price: { amount: '9,99 €', previous: '<14,99 €>', previousLabel: 'Former price' },
    features: ['Review tasks'],
  }));
  assert.match(translated, /Former price: <\/span>&lt;14,99 €&gt;<\/s>/);
});
