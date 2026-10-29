import assert from 'node:assert/strict';
import { test } from 'node:test';
import { siteConfig } from '../../src/config.js';
import { specOf } from '../../src/define.js';
import { components } from '../support/components.mjs';

/*
 * One option name, one option type. `docs/conventions.md` is the vocabulary; this is
 * the half of it a machine can check.
 *
 * It is the cheapest guard in the suite against the mistake that costs the most. The
 * API's job is to be callable without being looked up, and the thing that defeats
 * that is not a missing option — the validator names those — but a name that means
 * one thing in one component and something else in the next. `card({ items })` was a
 * list of strings while every other `items` in the library was a list of objects, so
 * learning either one made the other a build error.
 */

/** Every option path in one spec, flattened, with the type each one declares. */
function optionTypes(spec, into = new Map(), options = spec.options, prefix = '') {
  for (const [key, option] of Object.entries(options)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (!into.has(key)) {
      into.set(key, new Map());
    }

    const byType = into.get(key);
    byType.set(option.type, [...(byType.get(option.type) ?? []), `${spec.name}(${path})`]);

    if (option.of) {
      optionTypes(spec, into, option.of, path);
    }
  }

  return into;
}

/**
 * Pairs looked at, and why they stay. The same shape as the reviewed repeats in
 * `styles.test.mjs`: a name is occasionally the right word for two things, and the
 * reason belongs beside the exception rather than in a commit message.
 */
const REVIEWED = new Map([
  [
    'width: enum, number',
    'Deliberate: figure\'s width and height are the <img> attributes, by name, so that'
      + ' anyone who knows the element knows what they do — and they are the pair that'
      + ' reserves the space. A page width is a choice between the two declared content'
      + ' widths, which is an enum. Renaming either one would hide what it is.',
  ],
]);

/** Names used across more than one type, as `name: type, type`. */
function collisions(specs) {
  const seen = new Map();

  for (const spec of specs) {
    optionTypes(spec, seen);
  }

  return [...seen]
    .filter(([, byType]) => byType.size > 1)
    .map(([name, byType]) => ({
      key: `${name}: ${[...byType.keys()].sort().join(', ')}`,
      where: [...byType].map(([type, paths]) => `${type} in ${paths.join(', ')}`).join('; '),
    }));
}

test('one option name means one option type across the component API', () => {
  const found = collisions([...components].map(([, component]) => specOf(component)));
  const unreviewed = found.filter(({ key }) => !REVIEWED.has(key));

  assert.deepEqual(
    unreviewed.map(({ key, where }) => `${key} — ${where}`),
    [],
    'rename one of them, or record the pair in REVIEWED with the reason it stays',
  );
});

/*
 * The config is its own vocabulary: `name` is the product's name in site.config.js and
 * the icon's name in icon(), and neither is the one that should give up the word. So
 * it is checked against itself rather than against the components.
 */
test('the site config is consistent with itself, and is allowed its own words', () => {
  assert.deepEqual(collisions([specOf(siteConfig)]).map(({ key }) => key), []);
});

test('every reviewed exception is still a collision, so the list cannot go stale', () => {
  const live = new Set(collisions([...components].map(([, component]) => specOf(component))).map(({ key }) => key));

  assert.deepEqual(
    [...REVIEWED.keys()].filter((key) => !live.has(key)),
    [],
    'a recorded exception no longer exists — delete the entry',
  );
});

/**
 * The shared words, and the type each one is. This is `docs/conventions.md` as code:
 * the page says `body` carries inline markup and `text` never does, and a component
 * that disagrees is caught here rather than by a reader noticing the page is wrong.
 *
 * One-off names — `caption`, `tagline`, `amount` — are not here. The
 * vocabulary is the words used by more than one component; the rest is a component
 * saying what only it has.
 */
const VOCABULARY = {
  title: 'text',
  label: 'text',
  text: 'text',
  body: 'markup',
  lead: 'markup',
  note: 'markup',
  answer: 'markup',
  value: 'markup',
  content: 'content',
  items: 'items',
  term: 'text',
  question: 'text',
  icon: 'icon',
  variant: 'enum',
};

test('the shared words are the types the conventions page says they are', () => {
  const seen = new Map();

  for (const [, component] of components) {
    optionTypes(specOf(component), seen);
  }

  const wrong = Object.entries(VOCABULARY).flatMap(([name, type]) => {
    const byType = seen.get(name);

    if (!byType) {
      return [`${name} is in the vocabulary and used by no component — delete the row or use the word`];
    }

    return [...byType]
      .filter(([declared]) => declared !== type)
      .map(([declared, paths]) => `${name} is ${type} in docs/conventions.md and ${declared} in ${paths.join(', ')}`);
  });

  assert.deepEqual(wrong, []);
});
