import assert from 'node:assert/strict';
import { test } from 'node:test';
import { librarySheets, stripCssComments } from '../../src/cli/build.mjs';
import { LAYERS } from '../../src/tokens/contract.js';
import { LIB, filesIn, read } from '../support/library.mjs';

test('every stylesheet the build emits is assigned a layer, and none assigns its own', async () => {
  const sheets = await librarySheets();
  const assigned = Object.values(sheets).flat().map((path) => path.slice(LIB.length));
  const all = [
    ...filesIn('css', '.css'),
    ...filesIn('src/components', '.css'),
    'src/tokens/reset.css',
    'src/tokens/primitives.css',
  ];

  assert.deepEqual(
    all.filter((path) => !assigned.includes(path)),
    [],
    'a stylesheet exists that no cascade layer includes — it would ship unlayered or not at all',
  );

  for (const group of Object.keys(sheets)) {
    assert.ok(LAYERS.includes(group), `${group} is not a declared layer`);
  }

  // And nothing is declared that nothing fills: the site supplies two of the layers.
  const filled = [...Object.keys(sheets), 'ds.theme', 'site.blocks'];

  assert.deepEqual(
    LAYERS.filter((name) => !filled.includes(name)),
    [],
    'a layer is declared that no stylesheet is ever put in — an open door the docs cannot explain',
  );

  for (const path of all) {
    assert.doesNotMatch(read(path), /@layer\b/, `${path} assigns its own layer`);
  }
});

/**
 * Files inside one layer are concatenated in sorted order, which is only safe while no
 * two of them style the same selector — otherwise adding a component stylesheet
 * would silently change which of two rules wins. Nothing enforces that but this.
 */
test('no two library stylesheets declare the same selector', () => {
  const clashes = [];

  for (const [layer, paths] of Object.entries(librarySheets())) {
    const seen = new Map();

    for (const absolute of paths) {
      const path = absolute.slice(LIB.length);
      const selectors = new Set(
        [...read(path).matchAll(/^[ \t]*([.:&[a-z][^{@\n]*?)\s*\{/gm)].map(([, selector]) => selector.trim()),
      );

      for (const selector of selectors) {
        if (seen.has(selector)) {
          clashes.push(`${layer}: ${selector} — ${seen.get(selector)} and ${path}`);
        }

        seen.set(selector, path);
      }
    }
  }

  assert.deepEqual(clashes, [], 'two stylesheets fight over a selector, so their order has become load-bearing');
});

/* --- repeated declarations ------------------------------------------------------ */

/**
 * How much overlap is worth a human's attention. Five declarations is where the run
 * stops being two rules that happen to both centre something and starts being one
 * shape written twice — it was picked by running the check over the library and
 * reading every pair it produced, not guessed.
 */
const OVERLAP = 5;

/**
 * Repeats already looked at, and what the answer was.
 *
 * A duplicate is not automatically a bug: a design system says the same thing in two
 * places on purpose fairly often, and the reason belongs next to the pair rather than
 * in a commit message nobody will find. Adding a line here is the way to say "checked,
 * and it stays" — which is also what makes the ones that are *not* here worth reading.
 */
const REVIEWED = new Map();

/** Every `selector { … }` in one stylesheet, as a set of normalised declarations. */
function rulesOf(path) {
  const css = stripCssComments(read(path));

  return [...css.matchAll(/([.:&[a-z][^{@}]*?)\s*\{([^{}]*)\}/g)].map(([, selector, body]) => ({
    where: `${path} ${selector.trim().replace(/\s+/g, ' ')}`,
    declarations: new Set(body.split(';').map((one) => one.trim().replace(/\s+/g, ' ')).filter(Boolean)),
  }));
}

/**
 * Two rules that share a long run of declarations are one shape written twice, and the
 * fix is a shared class, a component that composes another, or a note saying why not.
 * None of those is a decision this test can make — so it reports the pair and asks,
 * which is the only honest thing a duplicate detector can do.
 *
 * It reads flat `selector { … }` rules only: a declaration inside a media query is not
 * compared with one outside it, which loses a little and invents nothing.
 */
test('no two rules repeat a long run of declarations without somebody having said why', () => {
  const rules = Object.values(librarySheets())
    .flat()
    .flatMap((absolute) => rulesOf(absolute.slice(LIB.length)));
  const unreviewed = [];
  const stale = new Set(REVIEWED.keys());

  for (let i = 0; i < rules.length; i += 1) {
    for (let j = i + 1; j < rules.length; j += 1) {
      const shared = [...rules[i].declarations].filter((one) => rules[j].declarations.has(one));

      if (shared.length < OVERLAP) {
        continue;
      }

      const pair = [rules[i].where, rules[j].where].sort().join(' + ');

      if (REVIEWED.has(pair)) {
        stale.delete(pair);
        continue;
      }

      unreviewed.push(`${pair}\n      shares ${shared.length}: ${shared.join('; ')}`);
    }
  }

  assert.deepEqual(
    unreviewed,
    [],
    'two rules say the same thing. Look at each pair and decide: extract a shared class'
      + ' (src/styles/base.css, under every component layer), compose the component that already'
      + ' owns the shape, or — if the repeat is deliberate — add the pair to REVIEWED in'
      + ' this file with the reason. Do not silence it without reading it.',
  );

  assert.deepEqual(
    [...stale],
    [],
    'a repeat listed in REVIEWED no longer exists — delete the entry so the list stays a'
      + ' record of live decisions rather than of old ones',
  );
});
