import assert from 'node:assert/strict';
import { test } from 'node:test';
import { optionsMarkdown, stalePages } from '../../scripts/tables.mjs';
import { TIER_NAMES, namesIn } from '../../src/cli/components.js';
import { LIB, read } from '../support/library.mjs';
import { siteConfig } from '../../src/config.js';

/**
 * The tier table in `docs/adding-a-component.md` ("Which group it belongs to is
 * which directory it goes in") is prose, not code — nothing regenerates it. This is
 * the same parity check `test/lint/documentation.test.mjs` runs for `docs/anti-patterns.md`
 * against the lint rules, applied to the one other place a "here are the tiers"
 * table is hand-written.
 */
test('adding-a-component.md\'s tier table names the same tiers as src/cli/components.js, in the same order', () => {
  const doc = read('docs/adding-a-component.md');
  const rows = [...doc.matchAll(/^\| \w+ \| `src\/components\/([a-z]+)\/` \|/gm)];

  assert.ok(rows.length > 0, 'the tier table in docs/adding-a-component.md was not found — did its shape change?');
  assert.deepEqual(
    rows.map(([, tier]) => tier),
    TIER_NAMES,
    'docs/adding-a-component.md lists a different set or order of tiers than src/cli/components.js',
  );
});

/**
 * `docs/architecture.md`'s component layers table restates example components per tier —
 * exactly the kind of fact that drifted silently before this test existed: it had
 * `section` (an organism) listed under Layout. Header and Footer follow the same
 * public organism checks; no component is exempt.
 */
test('the homepage links to architecture, which lists components under their real tier', () => {
  assert.match(read('docs/index.md'), /\]\(architecture\.md#component-layers\)/);
  const doc = read('docs/architecture.md');
  const aliases = { 'legal document': 'legalDocument' };

  for (const tier of TIER_NAMES) {
    const title = tier[0].toUpperCase() + tier.slice(1);
    const row = doc.match(new RegExp(`^\\| ${title} \\| ([^|]+) \\|`, 'm'));

    assert.ok(row, `docs/architecture.md has no "${title}" row in its layer table`);

    const names = row[1].split(',').map((entry) => aliases[entry.trim()] ?? entry.trim());
    const real = namesIn(tier);

    for (const name of names) {
      assert.ok(real.includes(name), `docs/architecture.md lists "${name}" under ${title}, but src/components/${tier}/ has no such file`);
    }
  }
});

/**
 * The generated tables live in the committed Markdown, not only in the built page.
 *
 * `docs/` ships inside the package, so a component page is read as text far more often
 * than it is read as HTML — by a person on GitHub, by an editor, by a model with the
 * package open. A placeholder fence made every one of those readings incomplete: the
 * prose and the examples were there and not one option.
 */
test('the tables committed in docs/ are the ones the generator writes', () => {
  assert.deepEqual(
    stalePages().map((path) => path.slice(LIB.length)),
    [],
    'a generated block in docs/ is out of date — run `npm run tables`',
  );
});

test('generated option tables include nested items and shapes recursively', () => {
  const legal = optionsMarkdown('legalDocument');
  const pricing = optionsMarkdown('plan');

  for (const path of ['sections', 'sections[].title', 'sections[].table', 'sections[].table.columns', 'sections[].table.rows']) {
    assert.ok(legal.includes(`\`${path}\``), `legalDocument omits nested path ${path}`);
  }

  for (const path of ['link', 'link.label', 'link.href']) {
    assert.ok(pricing.includes(`\`${path}\``), `plan omits nested path ${path}`);
  }
});

test('site configuration documents its generated contract including navigation and footer fields', () => {
  const doc = read(siteConfig.spec.docs);
  assert.match(doc, /```options siteConfig\n/);
  const table = optionsMarkdown('siteConfig');
  const documentedKeys = [...table.matchAll(/^\| `([\w]+)` \|/gm)].map(([, key]) => key);
  assert.deepEqual(documentedKeys.sort(), Object.keys(siteConfig.spec.options).sort(),
    'grouped tables must document every top-level option exactly once');
  assert.equal([...table.matchAll(/^## .+\n\n[^\n]+\n\n\| Option/gm)].length, 8,
    'each configuration block needs a heading, explanation and options table');
  for (const path of ['nav.hideOnScroll', 'nav.links[].href', 'footer.showContact', 'footer.groups[].links[].label']) {
    assert.ok(table.includes(`\`${path}\``), `site config omits ${path}`);
  }
});
