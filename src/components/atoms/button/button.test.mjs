import assert from 'node:assert/strict';
import { test } from 'node:test';
import { button } from './button.js';

test('button omits an action whose destination is not available yet', () => {
  assert.equal(button({ label: 'Get it', href: null }), null);
});
