import assert from 'node:assert/strict';
import { test } from 'node:test';
import { subsection } from './subsection.js';
import { card } from '../../molecules/card/card.js';
import { faq } from '../../molecules/faq/faq.js';

test('a subsection titles itself one level below the section head', () => {
  const grouped = subsection({ title: 'Formats', content: faq({ items: [{ question: 'q', answer: 'a' }] }) });

  assert.match(String(grouped), /<h3 class="ds-subsection__title">Formats<\/h3>/);
});

/*
 * The whole point of the group: content that titles itself goes under the group's own
 * heading rather than beside it. Cards were refused outright before this.
 */
test('content that titles itself is demoted under the group heading', () => {
  const grouped = String(subsection({ title: 'Project tools', content: card({ title: 'Notes', body: 'x' }) }));

  assert.match(grouped, /<h4 class="ds-card__title">Notes<\/h4>/);
  assert.doesNotMatch(grouped, /<h3 class="ds-card__title"/);
});

test('nesting demotes twice, and a question inside a group lands below it', () => {
  const nested = String(
    subsection({
      title: 'Storage',
      content: subsection({ title: 'Formats', content: faq({ items: [{ question: 'q', answer: 'a' }] }) }),
    }),
  );

  assert.match(nested, /<h3 class="ds-subsection__title">Storage<\/h3>/);
  assert.match(nested, /<h4 class="ds-subsection__title">Formats<\/h4>/);
  assert.match(nested, /<h5 class="ds-faq__title">q<\/h5>/);
});

/* A heading a reader typed was escaped on the way in, so it is text and stays text. */
test('a heading written into a text option is not markup and is not demoted', () => {
  assert.match(String(subsection({ title: 'Formats', content: '<h3>typed</h3>' })), /&lt;h3&gt;typed&lt;\/h3&gt;/);
});
