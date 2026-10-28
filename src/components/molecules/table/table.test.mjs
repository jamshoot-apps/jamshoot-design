import assert from 'node:assert/strict';
import { test } from 'node:test';
import { specOf } from '../../../define.js';
import { table } from './table.js';

test('table requires one cell per column', () => {
  assert.match(specOf(table).constraints.map((rule) => rule.describe).join('\n'), /every row as long as `columns`/);
  assert.throws(() => table({ columns: ['a', 'b'], rows: [['one']] }), /has 1 cells but there are 2 columns/);
});

/*
 * The scroll container is the only element in the library that scrolls on its own, so
 * it is the only one that has to be focusable. A regression here is invisible with a
 * mouse and total with a keyboard.
 */
test('the scroll container is reachable by keyboard', () => {
  const markup = String(table({ columns: ['a'], rows: [['one']] }));

  assert.match(markup, /<div class="ds-table-scroll" tabindex="0">/);
});

test('a caption names the region and the table, and its absence leaves no empty region', () => {
  const named = String(table({ columns: ['a'], rows: [['one']], caption: 'What it costs' }));

  assert.match(named, /role="region"/);
  assert.match(named, /aria-label="What it costs"/);
  assert.match(named, /<caption class="ds-table__caption">What it costs<\/caption>/);

  assert.doesNotMatch(String(table({ columns: ['a'], rows: [['one']] })), /role="region"|aria-label/);
});
