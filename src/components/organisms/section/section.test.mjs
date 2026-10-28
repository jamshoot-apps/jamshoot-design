import assert from 'node:assert/strict';
import { test } from 'node:test';
import { section } from './section.js';

test('section keeps its empty header for the CSS :empty rule', () => {
  assert.match(String(section({ content: 'x' })), /<header class="ds-section__head"><\/header>/);
});
