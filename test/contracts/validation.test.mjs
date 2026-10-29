import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as ds from '../../src/index.js';
import { ComponentError } from '../../src/define.js';

test('a wrong option is a build error that names the right one', () => {
  assert.throws(() => ds.card({ title: 'A', bodyText: 'B' }), (error) => {
    assert.ok(error instanceof ComponentError);
    assert.match(error.message, /unknown option "bodyText"/);
    assert.match(error.message, /Did you mean "body"\?/);
    assert.match(error.message, /src\/components\/molecules\/card\/README\.md/);
    return true;
  });

  // The commonest model mistake is a synonym, not a slip, so prefixes are suggested too.
  assert.throws(() => ds.button({ label: 'x', href: '#', iconName: 'star' }), /Did you mean "icon"\?/);
});

test('a missing required option, a bad enum and a bad row all fail', () => {
  assert.throws(() => ds.hero({ title: 'x' }), /"lead" is required \(string \(inline HTML allowed\)\)/);
  assert.throws(() => ds.section({ content: 'x', surface: 'sunk' }), /must be one of "default", "sunken"/);
  assert.throws(() => ds.steps({ items: [{ title: 'a', body: 'b' }, { title: 'b', bdy: 'c' }] }), /items\[1\]\.bdy/);
  assert.throws(() => ds.steps({ items: [{ title: 'a' }] }), /"items\[0\]\.body" is required/);
  assert.throws(() => ds.faq({ items: [{ question: 'q', answer: 'a', id: 'Not An Id' }] }), /lowercase letters/);
  // The icon set is the enum, so a wrong name fails like any other wrong value.
  assert.throws(() => ds.icon({ name: 'not-vendored' }), /must be one of "arrow-forward"/);
});

/*
 * `url` was `text` under another name. What it refuses is deliberately narrow: the two
 * mistakes that are mistakes every time, and nothing that would fail a store link or a
 * scheme this library has not heard of.
 */
test('a url refuses whitespace and a scheme that runs code, and nothing else', () => {
  assert.throws(() => ds.button({ label: 'x', href: 'javascript:alert(1)' }), /not a scheme that runs code/);
  assert.throws(() => ds.button({ label: 'x', href: 'JAVASCRIPT:alert(1)' }), /not a scheme that runs code/);
  assert.throws(() => ds.button({ label: 'x', href: 'java\nscript:alert(1)' }), /no spaces or quotes/);
  assert.throws(() => ds.figure({ src: 'my shot.png', alt: 'A' }), /no spaces or quotes/);

  for (const href of ['index.html', '#features', 'brand/mark.svg', 'https://example.test/a?b=c', 'mailto:a@b.test', 'itms-apps://itunes.apple.com/app/id1']) {
    assert.doesNotThrow(() => ds.button({ label: 'x', href }), `a legitimate destination was refused: ${href}`);
  }
});

test('an empty list is a build error, not an empty shell', () => {
  assert.throws(() => ds.card({ title: 'A', bullets: [] }), /non-empty array/);
  assert.throws(() => ds.steps({ items: [] }), /non-empty array/);
  assert.throws(() => ds.table({ columns: ['a'], rows: [] }), /non-empty array/);
});

test('content is markup this library made, not any object with a toString', () => {
  assert.throws(() => ds.prose({ content: { a: 1 } }), /must be renderable content, got object/);
  assert.throws(() => ds.section({ content: new Date() }), /renderable content/);
  assert.doesNotThrow(() => ds.prose({ content: ds.card({ title: 'A', body: 'b' }) }));
  assert.doesNotThrow(() => ds.prose({ content: ['a string', null, false] }));
});

/**
 * `markup` is the `<a>` and `<em>` a sentence carries. A block element typed into one
 * lands inside the element the renderer already made, and nothing downstream can tell
 * it from a component's own markup — which is what `subsection` reads to place a
 * heading level.
 */
test('an inline-markup option refuses a block element', () => {
  assert.throws(() => ds.note({ body: '<h3>Formats</h3>' }), /inline markup only — <h3> is a block element/);
  assert.throws(() => ds.section({ content: 'x', lead: '<p>Two</p>' }), /<p> is a block element/);
  assert.throws(
    () => ds.legalDocument({ sections: [{ title: 'A', paragraphs: ['<ul><li>x</li></ul>'] }] }),
    /<ul> is a block element/,
  );
  assert.throws(
    () => ds.table({ columns: ['a'], rows: [['<div>x</div>']] }),
    /<div> is a block element/,
  );
  assert.doesNotThrow(() => ds.note({ body: 'a <a href="#">link</a> and <em>stress</em>' }));
  assert.match(
    String(ds.faq({ items: [{ question: 'Contact?', answer: 'Email <a href="mailto:help@example.test">help@example.test</a>.' }] })),
    /Email <a href="mailto:help@example\.test">help@example\.test<\/a>\./,
  );
});

/**
 * `false` reads as "omit this" everywhere else in the system, which meant a boolean
 * could not be answered with it: the default came back instead.
 */
