import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as ds from '../../src/index.js';
import * as markup from '../../src/markup.js';
import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { TYPES, specOf } from '../../src/define.js';
import { exampleBlocks } from '../../scripts/docs.mjs';
import { TIER_NAMES, componentsIn, namesIn } from '../../src/cli/components.js';
import { LIB } from '../support/library.mjs';
import { components } from '../support/components.mjs';

/**
 * Every folder contains source and documentation. CSS is present unless the local
 * component spec explicitly says `styles: false`; empty files are never required.
 */
test('each component folder owns its source, README and optional declared stylesheet', () => {
  const problems = [];

  for (const tier of TIER_NAMES) {
    for (const entry of componentsIn(tier)) {
      if (!existsSync(entry.source)) problems.push(`${entry.name}: missing ${entry.name}.js`);
      if (!existsSync(entry.docs)) problems.push(`${entry.name}: missing README.md`);

      const spec = specOf(ds[entry.name]);

      if (spec?.styles === false && entry.stylesheet) problems.push(`${entry.name}: styles:false but CSS exists`);
      if (spec?.styles !== false && !entry.stylesheet) problems.push(`${entry.name}: missing ${entry.name}.css or styles:false`);
    }
  }

  assert.deepEqual(problems, []);
});

test('every option type says what it takes', () => {
  for (const [name, type] of Object.entries(TYPES)) {
    assert.ok(type.summary, `the ${name} option type has no summary, so the docs print it as an empty cell`);
    assert.ok(['component', 'config'].includes(type.scope ?? 'component'), `the ${name} option type has an unknown scope`);
  }
});

/* --- the component API ---------------------------------------------------------- */


test('every exported component is declared, and takes exactly one options object', () => {
  assert.ok(components.length > 0, 'no components were discovered');

  for (const [name, component] of components) {
    const spec = specOf(component);

    assert.equal(spec.name, name, `${name} is exported under a different name than it was defined with`);
    // One declared parameter, defaulted — which JavaScript reports as an arity of 0.
    assert.equal(component.length, 0, `${name} takes more than one options object`);
    assert.ok(spec.summary, `${name} has no summary`);
    assert.ok(spec.docs, `${name} does not say which page documents it`);

    for (const [option, declared] of Object.entries(spec.options)) {
      assert.ok(declared.summary, `${name}.${option} has no summary`);

      if (declared.type === 'enum') {
        assert.ok(Array.isArray(declared.values) && declared.values.length > 1, `${name}.${option} has no value set`);
      }
    }
  }
});

test('header and footer are public organisms with no internal-shell exemption', () => {
  for (const name of ['header', 'footer']) {
    assert.ok(specOf(ds[name]), `${name} is not a validated public component`);
    assert.ok(namesIn('organisms').includes(name), `${name} is not an organism`);
  }
  assert.equal(existsSync(join(LIB, 'src/shell')), false, 'page components must not escape normal component checks');
});

/**
 * `src/index.js` is hand-maintained, one export line per folder. So the tree and the
 * list can drift apart in either direction: a new component folder with no export,
 * or an export line whose file was renamed or moved. This is the same "the document
 * and the enforcement can't silently disagree" check `test/lint/documentation.test.mjs` runs for
 * `docs/anti-patterns.md` against the lint rules.
 */
test('every component file on disk is exported by src/index.js under its own name, and the reverse', () => {
  const onDisk = TIER_NAMES.flatMap((tier) => namesIn(tier).map((name) => ({ tier, name })));
  const exported = new Set(components.map(([name]) => name));

  assert.deepEqual(
    onDisk.filter(({ name }) => !exported.has(name)).map(({ tier, name }) => `src/components/${tier}/${name}/${name}.js`),
    [],
    'a component file exists that src/index.js does not export',
  );

  const onDiskNames = new Set(onDisk.map(({ name }) => name));

  assert.deepEqual(
    components.map(([name]) => name).filter((name) => !onDiskNames.has(name)),
    [],
    'src/index.js exports a component whose file is not under src/components/<tier>/',
  );

  // A filename that names the wrong component is caught above by `spec.name !== name`.
});

test('atomic component imports only point to lower tiers', () => {
  const allowed = {
    layout: [],
    atoms: [],
    molecules: ['layout', 'atoms'],
    organisms: ['layout', 'atoms', 'molecules'],
  };

  for (const tier of TIER_NAMES) {
    for (const entry of componentsIn(tier)) {
      const source = readFileSync(entry.source, 'utf8');
      const importedTiers = [...source.matchAll(/from ['"](\.[^'"]+)['"]/g)]
        .map(([, specifier]) => relative(join(LIB, 'src/components'), resolve(entry.directory, specifier)).split('/')[0])
        .filter((importedTier) => TIER_NAMES.includes(importedTier));

      for (const importedTier of importedTiers) {
        assert.ok(
          allowed[tier].includes(importedTier),
          `${entry.source.slice(LIB.length)} (${tier}) imports ${importedTier}; move the composition to a higher tier`,
        );
      }
    }
  }
});

test('component examples do not hide same-level composition', () => {
  const atomicTiers = ['atoms', 'molecules', 'organisms'];
  const entries = atomicTiers.flatMap((tier) => componentsIn(tier));
  const problems = [];

  for (const entry of entries) {
    const level = atomicTiers.indexOf(entry.tier);
    const forbidden = entries.filter((candidate) =>
      candidate.name !== entry.name && atomicTiers.indexOf(candidate.tier) >= level,
    );

    for (const code of exampleBlocks(readFileSync(entry.docs, 'utf8'))) {
      for (const candidate of forbidden) {
        if (new RegExp(`\\b${candidate.name}\\s*\\(`).test(code)) {
          problems.push(`${entry.docs.slice(LIB.length)} composes ${candidate.name} (${candidate.tier})`);
        }
      }
    }
  }

  assert.deepEqual(problems, [], 'move same-level composition to an organism or site block');
});

test('the raw-markup door is separate from the page API', () => {
  assert.equal(ds.h, undefined, 'h() is reachable from the page API');
  assert.equal(typeof markup.h, 'function');
  assert.equal(typeof markup.inlineIcon, 'function');
});
