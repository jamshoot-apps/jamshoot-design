import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { filesBelow } from '../../src/cli/files.js';
import { COMPONENT_TOKENS, COMPONENT_TOKEN_NAMES, LAYOUT_PRIMITIVES, PRIMITIVES, ROLE_NAMES, THEMEABLE } from '../../src/tokens/contract.js';
import { LIB, filesIn, libraryStyles, read } from '../support/library.mjs';

test('every primitive the contract names is declared in the CSS', () => {
  const css = read('src/tokens/primitives.css');
  const expected = [
    ...Object.entries(PRIMITIVES).flatMap(([group, steps]) => steps.map((step) => `--ds-${group}-${step}`)),
    ...LAYOUT_PRIMITIVES.map((name) => `--ds-${name}`),
  ];

  assert.deepEqual(
    expected.filter((name) => !css.includes(`${name}:`)),
    [],
    'src/tokens/primitives.css is missing names the contract promises',
  );
});

test('every starter palette sets exactly the twelve roles', () => {
  const starters = filesIn('src/tokens/themes', '.css');

  assert.ok(starters.length, 'the library ships no palette to start from');

  for (const theme of starters) {
    const declared = [...read(theme).matchAll(/--ds-([\w-]+)\s*:/g)].map(([, name]) => name);

    assert.deepEqual(declared.filter((name) => !THEMEABLE.includes(name)), [], `${theme} names something off-contract`);
    assert.deepEqual(ROLE_NAMES.filter((name) => !declared.includes(name)), [], `${theme} is missing a role`);
  }
});

test('every component token falls back to what the contract promises', () => {
  const css = libraryStyles().map(read).join('\n');

  for (const token of COMPONENT_TOKENS) {
    assert.ok(token.accepts?.summary, `--ds-${token.name} does not declare what site values it accepts`);
    assert.ok(css.includes(`var(--ds-${token.name},`), `no stylesheet reads --ds-${token.name}`);

    for (const fallback of [token.fallback, ...(token.variants ?? [])]) {
      const value = fallback.startsWith('--ds-') ? `var(${fallback})` : fallback;

      assert.ok(
        token.accepts.values?.includes(value) || token.accepts.pattern?.test(value),
        `--ds-${token.name} rejects its own fallback ${fallback}`,
      );
      assert.ok(
        css.includes(`var(--ds-${token.name}, ${fallback})`) ||
          css.includes(`var(--ds-${token.name}, var(${fallback}))`),
        `--ds-${token.name} does not fall back to ${fallback}`,
      );
    }
  }
});

test('every design token reference is owned or supplies its fallback', () => {
  const css = filesBelow(LIB, '.css').map((path) => readFileSync(path, 'utf8')).join('\n');
  const declared = new Set([...css.matchAll(/(--ds-[\w-]+)\s*:/g)].map(([, name]) => name));
  const referenced = [...css.matchAll(/var\((--ds-[\w-]+)(\s*,[^)]*)?\)/g)];
  const unknown = referenced.filter(([, name, fallback]) => !declared.has(name) && !fallback).map(([, name]) => name);
  const tokens = [...new Set(referenced.filter(([, name]) => !declared.has(name)).map(([, name]) => name.slice(5)))].sort();

  assert.deepEqual([...new Set(unknown)], []);
  assert.deepEqual(tokens, [...COMPONENT_TOKEN_NAMES].sort(), 'a stylesheet reads an undeclared component token');
});
