import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lint } from '../../src/cli/lint.mjs';
import { fencedBlocks } from '../../scripts/docs/fences.mjs';
import { filesIn, read } from '../support/library.mjs';
import { altTheme, ruleNames, rulesFor, theme } from '../support/lint-site.mjs';

test('contrast refuses a palette it cannot measure rather than passing it', () => {
  const results = rulesFor({
    'theme.css': theme.replace(/--ds-text-muted:[^;]+;/, '--ds-text-muted: oklch(0.7 0.02 250);'),
  });

  assert.ok(
    results.some((entry) => entry.rule === 'contrast' && entry.detail.includes('cannot be measured')),
    'an unparseable colour was silently skipped',
  );
});

test('malformed rgb channels and alpha cannot bypass contrast validation through NaN', () => {
  for (const value of ['rgb(1 2)', 'rgb(1 2 3 / nope)', 'rgb(1 2 3 /)', 'rgb(1 2 3 4 5)', 'rgb(1 2 3 / 2)']) {
    const problems = rulesFor({ 'theme.css': theme.replace(/--ds-text:[^;]+;/, `--ds-text: ${value};`) });
    assert.ok(problems.some((entry) => entry.rule === 'contrast' && entry.detail.includes('--ds-text cannot be measured')), value);
  }
});

test('contrast measures a translucent role against what is behind it', () => {
  const faint = theme.replace(/--ds-border-strong:[^;]+;/, '--ds-border-strong: rgb(242 244 247 / 0.08);');
  const results = rulesFor({ 'theme.css': faint });

  assert.ok(
    results.some((entry) => entry.rule === 'contrast' && entry.detail.includes('--ds-border-strong')),
    'a control boundary nobody can see was allowed',
  );
});

test('contrast covers accent text and the interactive accent fill', () => {
  const weakText = rulesFor({
    'theme.css': theme.replace(/--ds-accent:[^;]+;/, '--ds-accent: #777777;'),
  });
  const weakHoverPair = rulesFor({
    'theme.css': altTheme
      .replace(/--ds-accent:[^;]+;/, '--ds-accent: #000000;')
      .replace(/--ds-accent-strong:[^;]+;/, '--ds-accent-strong: #555555;')
      .replace(/--ds-on-accent:[^;]+;/, '--ds-on-accent: #777777;'),
  });

  assert.ok(
    weakText.some((entry) => entry.rule === 'contrast' && entry.detail.includes('--ds-accent on --ds-surface')),
    'accent-coloured text was held only to the non-text threshold',
  );
  assert.ok(
    weakHoverPair.some((entry) => entry.rule === 'contrast' && entry.detail.includes('--ds-on-accent on --ds-accent-strong')),
    'text over the interactive accent step was not measured',
  );
});

test('theme-contract accepts a component token and still refuses an invented one', () => {
  const withKnob = rulesFor({ 'theme.css': theme.replace('}', '  --ds-button-radius: var(--ds-radius-sm);\n}') });
  const withJunk = rulesFor({ 'theme.css': theme.replace('}', '  --ds-shadow-blue: #00f;\n}') });

  assert.deepEqual(withKnob.filter((entry) => entry.rule === 'theme-contract'), [], 'a contract knob was refused');
  assert.ok(ruleNames(withJunk).includes('theme-contract'), 'an invented token was allowed');
});

test('theme-contract validates component-token values and protects library tokens', () => {
  const badRadius = rulesFor({ 'theme.css': theme.replace('}', '  --ds-button-radius: 13px;\n}') });
  const badSurface = rulesFor({ 'theme.css': theme.replace('}', '  --ds-card-surface: hotpink;\n}') });
  const badTracks = rulesFor({ 'theme.css': theme.replace('}', '  --ds-split-columns: nonsense;\n}') });
  const badBlock = rulesFor({ 'blocks/scene.css': '.cb-scene { --_grid-min: 20rem; }\n' });

  for (const results of [badRadius, badSurface, badTracks, badBlock]) {
    assert.ok(ruleNames(results).includes('theme-contract'));
  }
});

test('a site with no theme.css is a failure, not a crash', () => {
  const site = mkdtempSync(join(tmpdir(), 'ds-bare-'));

  try {
    const results = lint(site);

    assert.ok(ruleNames(results).includes('theme-contract'), 'a site with no theme.css did not fail theme-contract');
    assert.match(results.find((entry) => entry.rule === 'theme-contract').detail, /no theme\.css/);
  } finally {
    rmSync(site, { recursive: true, force: true });
  }
});

for (const path of filesIn('src/tokens/themes', '.css')) {
  test(`the starter palette ${path} passes the theme rules`, () => {
    const problems = rulesFor({ 'theme.css': read(path) })
      .filter((entry) => ['theme-contract', 'contrast'].includes(entry.rule));
    assert.deepEqual(problems, []);
  });
}

test('the documented warm paper palette passes on the light starter', () => {
  const example = [...fencedBlocks(read('docs/theming.md'))]
    .find((block) => block.kind === 'css' && block.body.join('\n').includes('themes/warm-paper.css'));
  assert.ok(example, 'the documented warm paper palette is missing');
  const problems = rulesFor({ 'theme.css': altTheme, 'themes/warm-paper.css': example.body.join('\n') })
    .filter((entry) => ['theme-contract', 'contrast'].includes(entry.rule));
  assert.deepEqual(problems, []);
});

test('a palette that has gone unreadable is caught, whatever hue it is', () => {
  const problems = rulesFor({
    'theme.css': theme
      .replace(/--ds-accent:[^;]+;/, '--ds-accent: #a78bfa;')
      .replace(/--ds-text-muted:[^;]+;/, '--ds-text-muted: #2a2d33;'),
  }).filter((entry) => entry.rule === 'contrast');
  assert.ok(problems.some((entry) => entry.detail.includes('--ds-text-muted')), 'unreadable muted text was not reported');
  assert.deepEqual(problems.filter((entry) => entry.detail.includes('--ds-accent ')), [], 'a readable accent was refused for its hue');
});

test('a theme declares whether native controls are dark or light', () => {
  const problems = rulesFor({ 'theme.css': theme.replace('color-scheme: dark;', '') });
  assert.ok(problems.some((entry) => entry.rule === 'theme-contract' && entry.detail.includes('color-scheme')));
});

/* --- more than one palette ------------------------------------------------------ */

test('every palette is measured, resolved against the base the way the cascade will', () => {
  /* A palette that changes three things, one of them into text nobody can read. */
  const problems = rulesFor({
    'theme.css': altTheme,
    'themes/dark.css': [
      ':root {',
      '  color-scheme: dark;',
      '  --ds-bg: #0b0c0e;',
      '  --ds-surface: #131518;',
      '  --ds-text: #2b2f36;',
      '}',
    ].join('\n'),
  }).filter((entry) => entry.rule === 'contrast');

  assert.ok(problems.length, 'an alternate palette was never measured');
  assert.ok(
    problems.every((entry) => entry.where.endsWith('themes/dark.css')),
    'a failure was reported against the base rather than the palette that caused it',
  );
  assert.ok(
    problems.some((entry) => entry.detail.includes('--ds-text on --ds-bg')),
    'a role the palette overrode was measured against the base surface it replaced',
  );
});

test('a palette inherits the roles it does not set, so it may be three lines long', () => {
  const problems = rulesFor({
    'theme.css': theme,
    /* Only the accent moves; every other role is the base's, and still measured. */
    'themes/copper.css': ':root {\n  color-scheme: dark;\n  --ds-accent: #e0a878;\n  --ds-accent-strong: #f0c9a8;\n}\n',
  }).filter((entry) => ['theme-contract', 'contrast'].includes(entry.rule));

  assert.deepEqual(problems, []);
});

test('a palette that answers a system preference has to be the palette it claims', () => {
  const problems = rulesFor({
    'theme.css': theme,
    'themes/light.css': altTheme.replace('color-scheme: light;', 'color-scheme: dark;'),
  });

  assert.ok(
    problems.some((entry) => entry.rule === 'theme-contract' && entry.detail.includes('color-scheme: light')),
    'a palette called light was allowed to be a dark one',
  );
});

test('two palettes cannot answer the same system preference', () => {
  const problems = rulesFor({
    'theme.css': theme,
    'themes/dark.css': theme,
  });

  assert.ok(
    problems.some((entry) => entry.rule === 'theme-contract' && entry.detail.includes('answer a dark system')),
    'a site could ship two palettes for one preference and leave the choice to the build order',
  );
});

test('a palette name is a file name, and the base name is reserved', () => {
  const reserved = rulesFor({ 'theme.css': theme, 'themes/default.css': altTheme });
  const shouted = rulesFor({ 'theme.css': theme, 'themes/Warm Paper.css': altTheme });

  for (const problems of [reserved, shouted]) {
    assert.ok(
      problems.some((entry) => entry.rule === 'theme-contract' && entry.detail.includes('cannot be a palette name')),
      'a name the attribute cannot carry was accepted',
    );
  }
});

test('a palette is one :root block, and what the build would drop is reported', () => {
  const problems = rulesFor({
    'theme.css': `${theme}\n@media (prefers-color-scheme: light) {\n  :root { --ds-bg: #fff; }\n}\n`,
  });

  assert.ok(
    problems.some((entry) => entry.rule === 'theme-contract' && entry.detail.includes('one :root block')),
    'a rule the build never carries was written into a palette and never mentioned again',
  );
});

test('a palette naming an icon the library does not have is reported against the palette', () => {
  const problems = rulesFor({
    'theme.css': theme,
    'themes/copper.css': ":root {\n  color-scheme: dark;\n  --ds-theme-icon: 'not-an-icon';\n  --ds-accent: #e0a878;\n}\n",
  });

  assert.ok(
    problems.some((entry) => entry.rule === 'theme-contract' && entry.detail.includes('installed SVG icon set')),
    'a typo reached the control instead of being reported against the file that made it',
  );

  /* And a palette that names a real one is not reported for naming one at all. */
  const fine = rulesFor({
    'theme.css': theme,
    'themes/copper.css': ":root {\n  color-scheme: dark;\n  --ds-theme-icon: 'eye-outline';\n  --ds-accent: #e0a878;\n}\n",
  });

  assert.ok(!fine.some((entry) => entry.detail.includes('installed SVG icon set')), 'a real icon name was refused');
});

test('a palette that changes no colour is reported rather than offered', () => {
  const problems = rulesFor({
    'theme.css': theme,
    'themes/quiet.css': ":root {\n  color-scheme: dark;\n  --ds-theme-label: 'Quiet';\n}\n",
  });

  assert.ok(
    problems.some((entry) => entry.rule === 'theme-contract' && entry.detail.includes('declares no colour')),
    'a choice that does nothing was allowed into the control',
  );
});
