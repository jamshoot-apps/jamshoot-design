import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseColour, over, contrast } from '../../src/cli/colours.js';

test('shared colour analysis parses alpha, rejects malformed values and measures composited contrast', () => {
  assert.deepEqual(parseColour('#1234'), [17, 34, 51, 68 / 255]);
  assert.deepEqual(parseColour('#11223380'), [17, 34, 51, 128 / 255]);
  assert.deepEqual(parseColour('rgb(10 20 30 / 50%)'), [10, 20, 30, 0.5]);
  assert.deepEqual(parseColour('rgba(10, 20, 30, 0.5)'), [10, 20, 30, 0.5]);
  for (const value of [undefined, '#12345', '#1234567', 'rgb(999 0 0)', 'rgb(0 0 0 / 2)', 'rgb(0 0 0) trailing', 'red']) {
    assert.equal(parseColour(value), null, String(value));
  }
  assert.deepEqual(over(parseColour('rgb(0 0 0 / 50%)'), [255, 255, 255]), [127.5, 127.5, 127.5]);
  assert.equal(contrast([0, 0, 0], [255, 255, 255]), 21);
  assert.equal(contrast([127, 127, 127], [127, 127, 127]), 1);
});
