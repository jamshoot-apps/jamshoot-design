import assert from 'node:assert/strict';
import { test } from 'node:test';
import { specOf } from '../../../define.js';
import { steps } from './steps.js';

test('a step declares no icon, because the renderer draws none', () => {
  assert.equal(specOf(steps).options.items.of.icon, undefined);
});
