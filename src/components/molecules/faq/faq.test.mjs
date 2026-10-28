import assert from 'node:assert/strict';
import { test } from 'node:test';
import { faq } from './faq.js';

const one = (item) => String(faq({ items: [item] }));

/*
 * Both of these are invisible on screen and load-bearing off it: the heading is how a
 * screen reader walks an FAQ, and the id on the <details> is what `src/runtime/faq.js`
 * finds with `closest('details')`. A question moved back into a plain span, or an id
 * moved onto an inner element, breaks one of the two silently.
 */
test('a question is a heading inside its summary', () => {
  assert.match(
    one({ question: 'Does it work offline?', answer: 'Yes.' }),
    /<summary class="ds-faq__question"><h3 class="ds-faq__title">Does it work offline\?<\/h3>/,
  );
});

test('an id anchors the item, so a deep link has a <details> to open', () => {
  assert.match(one({ id: 'offline', question: 'Offline?', answer: 'Yes.' }), /<details class="ds-faq__item" id="offline">/);
});
