import assert from 'node:assert/strict';
import { test } from 'node:test';
import { signature, specOf } from '../../src/define.js';
import { llmsText } from '../../scripts/llms.mjs';
import { read } from '../support/library.mjs';
import { components } from '../support/components.mjs';
import { pagesToBuild } from '../../scripts/docs.mjs';
import { docPages } from '../../scripts/tables.mjs';

test('every documentation page is included in the built reference', async () => {
  const built = new Set((await pagesToBuild()).map(({ path }) => path));
  assert.deepEqual(docPages().filter((path) => !built.has(path)), [], 'a source doc escaped docs-site discovery');
});

test('llms.txt is a compact linked catalog of the whole API', () => {
  const text = llmsText();

  for (const [name, component] of components) {
    assert.ok(text.includes(signature(specOf(component))), `llms.txt does not print ${name}'s signature`);
    assert.ok(text.includes(`](${specOf(component).docs})`), `llms.txt does not link ${name}'s README`);
  }

  assert.doesNotMatch(text, /^## (?:Colour|Shape|Component tokens|Icons)$/m, 'llms.txt duplicates detailed contracts');
  assert.equal((text.match(/\| Option \| Accepts/g) ?? []).length, 0, 'llms.txt embeds detailed option tables');
});

test('the llms.txt in the package is the one the generator writes', () => {
  /*
   * It ships in `files`, so a consumer reads the committed copy rather than running
   * the generator. Without this, one forgotten `npm run llms` puts a stale API in
   * front of every model that opens the package — the drift the file exists to end.
   */
  assert.equal(read('llms.txt'), llmsText(), 'llms.txt is out of date — run `npm run llms`');
});
