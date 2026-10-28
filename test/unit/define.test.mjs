import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defineComponent } from '../../src/define.js';

test('false is an answer to a boolean option, not an omission', () => {
  const flagged = defineComponent('flagged', {
    summary: 'x',
    docs: 'src/components/atoms/badge/README.md',
    options: { on: { type: 'boolean', default: true, summary: 'x' } },
    render: ({ on }) => String(on),
  });

  assert.equal(flagged({}), 'true');
  assert.equal(flagged({ on: false }), 'false');
  assert.equal(flagged({ on: null }), 'true');
});
