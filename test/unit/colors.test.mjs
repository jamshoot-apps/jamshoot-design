import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseColor, over, contrast } from '../../src/cli/colors.js';

test('shared color analysis parses alpha, rejects malformed values and measures composited contrast', () => {
  assert.deepEqual(parseColor('#1234'), [17, 34, 51, 68 / 255]);
  assert.deepEqual(parseColor('#11223380'), [17, 34, 51, 128 / 255]);
  assert.deepEqual(parseColor('rgb(10 20 30 / 50%)'), [10, 20, 30, 0.5]);
  assert.deepEqual(parseColor('rgba(10, 20, 30, 0.5)'), [10, 20, 30, 0.5]);
  for (const value of [undefined, '#12345', '#1234567', 'rgb(999 0 0)', 'rgb(0 0 0 / 2)', 'rgb(0 0 0) trailing', 'red']) {
    assert.equal(parseColor(value), null, String(value));
  }
  assert.deepEqual(over(parseColor('rgb(0 0 0 / 50%)'), [255, 255, 255]), [127.5, 127.5, 127.5]);
  assert.equal(contrast([0, 0, 0], [255, 255, 255]), 21);
  assert.equal(contrast([127, 127, 127], [127, 127, 127]), 1);
});
