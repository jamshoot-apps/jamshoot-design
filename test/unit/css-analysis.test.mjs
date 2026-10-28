import assert from 'node:assert/strict';
import { test } from 'node:test';
import { stripCssComments } from '../../src/cli/build.mjs';

test('CSS analysis ignores comments without confusing quoted data with comments', () => {
  assert.equal(stripCssComments('.x{content:"/* text */"}/* note */'), '.x{content:"/* text */"} ');
});
