import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ruleNames, rulesFor } from '../support/lint-site.mjs';

test('page-markup catches a page that writes markup by hand', () => {
  const viaImport = rulesFor({ 'pages.js': "import { h } from '@jamshoot-apps/design/markup';\n" });
  const viaClass = rulesFor({ 'pages.js': "export const pages = [{ id: 'x', class: 'ds-grid ds-grid--cell-md' }];\n" });
  const inContent = rulesFor({ 'content/home.js': "export const home = { wrapper: 'ds-stack' };\n" });

  assert.ok(ruleNames(viaImport).includes('page-markup'), 'the raw-markup import was allowed in a page');
  assert.ok(ruleNames(viaClass).includes('page-markup'), 'a library class name was allowed in a page');
  assert.ok(ruleNames(inContent).includes('page-markup'), 'a library class name was allowed in a content file');
});

test('a site block may compose design-system components, markup and tokens', () => {
  const results = rulesFor({
    'blocks/scene.js':
      "import { card } from '@jamshoot-apps/design';\n" +
      "import { h } from '@jamshoot-apps/design/markup';\n" +
      "export const scene = () => h('div', { class: 'cb-scene' }, card({ title: 'A', body: 'B' }));\n",
    'blocks/scene.css':
      '.cb-scene { gap: var(--ds-space-md); color: var(--ds-text); }\n' +
      '.cb-scene .ds-card { --ds-card-radius: var(--ds-radius-sm); }\n',
  });

  assert.deepEqual(
    results.filter((entry) => ['page-markup', 'scale', 'theme-color', 'token-assignment'].includes(entry.rule)),
    [],
  );
});

test('a banned word in content is caught', () => {
  const rules = ruleNames(rulesFor({ 'content/x.js': 'export const x = { lead: "A seamless, effortless experience." };' }));
  assert.ok(rules.includes('hollow-claims'), 'banned word was not reported');
});
