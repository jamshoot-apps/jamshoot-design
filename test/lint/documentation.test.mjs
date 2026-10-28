import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RULES, RULE_NAMES } from '../../src/cli/lint.mjs';
import { LIB } from '../support/library.mjs';

test('every rule the lint enforces is a section in docs/anti-patterns.md, and the reverse', () => {
  const doc = readFileSync(join(LIB, 'docs/anti-patterns.md'), 'utf8');
  const documented = [...doc.matchAll(/^### `([\w-]+)`\s+—\s+(.+)$/gm)].map(([, name, title]) => ({ name, title }));

  assert.deepEqual(
    RULE_NAMES.filter((name) => !documented.some((entry) => entry.name === name)),
    [],
    'the lint enforces a rule the document does not explain',
  );

  assert.deepEqual(
    documented.filter((entry) => !RULES[entry.name]).map((entry) => entry.name),
    [],
    'the document describes a rule the lint does not enforce',
  );

  for (const { name, title } of documented) {
    assert.equal(title.trim(), RULES[name].summary, `docs and lint disagree on what \`${name}\` is called`);
  }
});
