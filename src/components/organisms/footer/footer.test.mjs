import assert from 'node:assert/strict';
import { test } from 'node:test';
import { footer } from './footer.js';

test('a footer can omit its intro without discarding its contact option', () => {
  const options = {
    email: 'help@example.com', showContact: false,
    groups: [{ title: 'Help', links: [{ label: 'Support', href: 'support.html' }] }], copyright: 'Example',
  };
  const markup = String(footer(options));
  assert.doesNotMatch(markup, /ds-footer__blurb|ds-footer__contact|ds-footer__top--with-intro|mailto:/);
  assert.match(markup, /href="support.html">Support/);
  assert.equal(options.email, 'help@example.com');
  const normal = String(footer({ ...options, blurb: 'Example product', showContact: true }));
  assert.match(normal, /ds-footer__top--with-intro/);
  assert.match(normal, /ds-footer__blurb">Example product/);
  assert.match(normal, /mailto:help@example.com/);
});
