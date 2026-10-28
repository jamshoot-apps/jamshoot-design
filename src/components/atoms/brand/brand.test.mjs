import { specOf } from '../../../define.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { brand } from './brand.js';

test('brand() composes an optional name and tagline beside or below any logo', () => {
  assert.equal(
    String(brand({ logo: 'app_icon.png', text: 'Example', tagline: 'Useful tagline', position: 'bottom', href: '/' })),
    '<a class="ds-brand ds-brand--bottom" href="/"><img class="ds-brand__logo" src="app_icon.png" alt="" width="64" height="64"><span class="ds-brand__copy"><span class="ds-brand__text">Example</span><span class="ds-brand__tagline">Useful tagline</span></span></a>',
  );

  assert.match(String(brand({ logo: 'example.svg', label: 'Example' })), /alt="Example"/);
  assert.throws(() => brand({ logo: 'unlabelled.svg' }), /needs "text" or "label" — a logo with no name/);
  assert.throws(() => brand({ logo: 'x.svg', text: 'x', position: 'left' }), /must be one of "right", "bottom"/);
});

/**
 * `compact` is what lets a header place this component rather than render a lockup of
 * its own, so what is worth holding is that the difference is entirely in the CSS: the
 * markup is the same elements under one more class, and the two things a bar needs —
 * a small square logo, and a tagline that waits for room — are both that class's.
 */
test('compact is a modifier on the same markup, and carries the whole difference a bar needs', () => {
  const bar = String(brand({ logo: 'app_icon.png', text: 'Example', tagline: 'Useful tagline', href: '/', compact: true }));
  const plain = String(brand({ logo: 'app_icon.png', text: 'Example', tagline: 'Useful tagline', href: '/' }));
  const css = readFileSync(new URL('brand.css', import.meta.url), 'utf8');

  assert.match(bar, /class="ds-brand ds-brand--compact"/);
  assert.equal(bar.replace(' ds-brand--compact', ''), plain, 'compact changed the markup, not only the class');

  assert.match(css, /\.ds-brand--compact \.ds-brand__logo\s*\{[^}]*width:\s*var\(--ds-space-2xl\)/s, 'the bar logo is not smaller');
  assert.match(css, /\.ds-brand--compact \.ds-brand__tagline\s*\{\s*display:\s*none;/, 'the tagline does not wait for room');
  assert.match(
    css,
    /@media \(min-width: 52rem\) \{\s*\.ds-brand--compact \.ds-brand__tagline\s*\{\s*display:\s*block;/s,
    'the tagline never arrives',
  );
});

test('brand declares its accessible name constraint and refuses a label without a logo', () => {
  assert.match(specOf(brand).constraints.map((rule) => rule.describe).join('\n'), /at least one of `text` or `label`/);
  assert.throws(() => brand({ label: 'Example' }), /needs "logo" when "label" is set/);
});
