import assert from 'node:assert/strict';
import { test } from 'node:test';
import { legalDocument } from './legalDocument.js';

test('a policy renders its clauses in the order the options declare', () => {
  const rendered = String(
    legalDocument({
      sections: [
        {
          title: 'Data',
          paragraphs: ['A paragraph.'],
          list: ['A bullet.'],
          table: { columns: ['Kind'], rows: [['Diagnostics']] },
          outro: ['A closing line.'],
        },
      ],
    }),
  );

  const order = ['A paragraph.', 'A bullet.', 'Diagnostics', 'A closing line.'].map((text) => rendered.indexOf(text));

  assert.deepEqual(order, [...order].sort((a, b) => a - b), 'the rendered order is not the documented one');
  assert.ok(order.every((index) => index !== -1));
});

test('legalDocument refuses a heading with no content', () => {
  assert.throws(() => legalDocument({ sections: [{ title: 'Data' }] }), /heading with nothing under it/);
});
