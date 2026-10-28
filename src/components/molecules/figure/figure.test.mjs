import assert from 'node:assert/strict';
import { test } from 'node:test';
import { specOf } from '../../../define.js';
import { figure } from './figure.js';

test('figure requires explicit alt text for an image, including intentional empty alt', () => {
  assert.match(specOf(figure).constraints.map((rule) => rule.describe).join('\n'), /`alt` whenever `src` is set/);
  assert.throws(() => figure({ src: 'shot.png' }), /needs "alt" when "src" is set/);
  assert.doesNotThrow(() => figure({ src: 'shot.png', alt: '' }), 'an explicit empty alt is a choice');
});
