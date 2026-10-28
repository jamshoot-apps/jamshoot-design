import assert from 'node:assert/strict';
import { test } from 'node:test';
import { specOf } from '../../src/define.js';
import { components } from '../support/components.mjs';
import { read } from '../support/library.mjs';

test('every component constraint is explained in its local documentation', () => {
  for (const [name, component] of components) {
    const spec = specOf(component);
    const doc = read(spec.docs);
    for (const rule of spec.constraints ?? []) {
      assert.ok(rule.describe, `${name}: a constraint has no explanation`);
      assert.ok(doc.includes(rule.describe), `${name}: README omits constraint "${rule.describe}"`);
    }
  }
});
