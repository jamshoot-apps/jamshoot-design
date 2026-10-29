import assert from 'node:assert/strict';
import { test } from 'node:test';
import { siteConfig } from '../../src/config.js';

const CONFIG = {
  brand: { name: 'X' },
  nav: { links: [{ label: 'Home', href: 'index.html' }] },
  footer: { blurb: 'b', groups: [{ title: 't', links: [{ label: 'a', href: '#' }] }], copyright: (year) => `© ${year}` },
};

test('the site config is checked the way a component is', () => {
  assert.throws(() => siteConfig({ ...CONFIG, footer: { ...CONFIG.footer, group: [] } }), /Did you mean "groups"\?/);
  assert.throws(() => siteConfig({ ...CONFIG, footer: { ...CONFIG.footer, columns: [] } }), /footer\.columns/);
  assert.throws(() => siteConfig({ ...CONFIG, nav: { ...CONFIG.nav, homeHref: 'index.html' } }), /nav\.homeHref/);
  assert.throws(() => siteConfig({ ...CONFIG, brand: {} }), /"brand\.name" is required/);
  assert.throws(() => siteConfig({ ...CONFIG, nav: { links: [{ label: 'Home' }] } }), /"nav\.links\[0\]\.href" is required/);

  const resolved = siteConfig(CONFIG);

  assert.equal(resolved.skipLink, 'Skip to main content', 'a default the templates rely on was not filled in');
  assert.deepEqual(resolved.runtime, ['nav']);
  assert.equal(resolved.nav.hideOnScroll, false);
  assert.equal(resolved.brand.href, 'index.html', 'the brand lockup has no home link to fall back on');
});

test('scroll-away navigation requires its runtime and a boolean option', () => {
  const config = { ...CONFIG, nav: { ...CONFIG.nav, hideOnScroll: true } };
  assert.equal(siteConfig(config).nav.hideOnScroll, true);
  assert.throws(() => siteConfig({ ...config, runtime: ['faq'] }), /runtime does not list "nav"/);
  assert.throws(() => siteConfig({ ...config, nav: { ...config.nav, hideOnScroll: 'true' } }), /nav\.hideOnScroll/);
});

