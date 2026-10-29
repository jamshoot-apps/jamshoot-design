import assert from 'node:assert/strict';
import { test } from 'node:test';
import { foreignComponentClasses, componentTokenAssignments } from '../../src/cli/lint.mjs';
import { ruleFor, ruleNames, rulesFor } from '../support/lint-site.mjs';

test('scroll-animation allows library navigation but still rejects site scroll effects', () => {
  assert.ok(ruleFor({ 'blocks/nav.client.js': "window.addEventListener('scroll', () => {});" }).includes('scroll-animation'));
  assert.ok(ruleFor({ 'blocks/scene.client.js': 'new IntersectionObserver(() => {});' }).includes('scroll-animation'));
  assert.ok(!ruleFor({}).includes('scroll-animation'), 'the library header scroll listener was rejected');
});

test('layer catches a stylesheet that assigns its own cascade layer', () => {
  const results = rulesFor({ 'blocks/scene.css': '@layer site.overrides {\n  .cb-scene { display: grid; }\n}\n' });

  assert.ok(ruleNames(results).includes('layer'), 'a hand-written @layer was allowed');
});

test('scale holds the library to the scale and a block to the page rhythm and type scale', () => {
  /*
   * A block draws a motif of its own — a perspective, a blur — and those are the
   * point of it. What it may not do is invent a gap beside the ones on the scale.
   */
  const motif = rulesFor({ 'blocks/scene.css': '.cb-scene { perspective: 1200px; filter: blur(11px); }\n' });
  const rhythm = rulesFor({ 'blocks/scene.css': '.cb-scene { gap: 13px; }\n' });
  const characterRhythm = rulesFor({ 'blocks/scene.css': '.cb-scene { gap: 60ch; }\n' });
  const rawType = rulesFor({ 'blocks/scene.css': '.cb-scene { font-size: 4.5rem; line-height: 1; }\n' });
  const tokenType = rulesFor({
    'blocks/scene.css':
      '.cb-scene { font-size: var(--ds-text-display); line-height: var(--ds-leading-tight); }\n',
  });

  assert.deepEqual(motif.filter((entry) => entry.rule === 'scale'), [], 'a block was refused its own motif');
  assert.ok(ruleNames(rhythm).includes('scale'), 'a block invented a gap off the scale');
  assert.ok(ruleNames(characterRhythm).includes('scale'), 'a character-relative length bypassed the scale');
  assert.ok(ruleNames(rawType).includes('scale'), 'a block invented typography outside the type scale');
  assert.deepEqual(tokenType.filter((entry) => entry.rule === 'scale'), [], 'type-scale tokens were refused');
});

test('scale holds stacking order to the layer scale, in a block as much as in the library', () => {
  const raw = rulesFor({ 'blocks/scene.css': '.cb-scene { position: sticky; z-index: 9999; }\n' });
  const token = rulesFor({ 'blocks/scene.css': '.cb-scene { position: sticky; z-index: var(--ds-layer-chrome); }\n' });
  const excused = rulesFor({
    'blocks/scene.css': '.cb-scene {\n  /* ds-allow: layer — the print sits under its own frame. */\n  z-index: -1;\n}\n',
  });

  assert.ok(ruleNames(raw).includes('scale'), 'a block raised a number until it covered the header');
  assert.deepEqual(token.filter((entry) => entry.rule === 'scale'), [], 'the layer scale was refused');
  assert.deepEqual(excused.filter((entry) => entry.rule === 'scale'), [], 'a stated reason was refused');
});

test('token-assignment catches a library rule that assigns a site component token', () => {
  assert.deepEqual(
    componentTokenAssignments('.ds-grid--cell-md {\n  --ds-grid-min: 20rem;\n}\n'),
    ['grid-min'],
    'a modifier was allowed to overwrite what the site set',
  );

  // The shape that is allowed: read the component token, assign the private variable.
  assert.deepEqual(componentTokenAssignments('.ds-grid--cell-md {\n  --_grid-min: var(--ds-grid-min, var(--ds-measure-md));\n}\n'), []);
});

test('component-boundary checks literal foreign classes without banning owned descendants', () => {
  const source = "h('article', { class: 'ds-card' }, h('div', { class: 'ds-card__media' }))";

  assert.deepEqual(
    foreignComponentClasses(source, '.ds-card__media .ds-figure__frame { display: block; }'),
    ['ds-figure__frame'],
  );
  assert.deepEqual(
    foreignComponentClasses(source, '[data-ds-card-media] .ds-card__media > img { display: block; }'),
    [],
  );
});

test('breakpoint catches a breakpoint that is not one of the three', () => {
  const results = rulesFor({ 'blocks/scene.css': '@media (min-width: 41rem) {\n  .cb-scene { display: none; }\n}\n' });

  assert.ok(ruleNames(results).includes('breakpoint'), 'a fourth breakpoint was allowed');
});

test('focus-visible catches a stylesheet that takes the ring away and draws nothing', () => {
  const removed = ruleFor({ 'blocks/scene.css': '.cb-scene__button:focus { outline: none; }\n' });
  const replaced = ruleFor({
    'blocks/scene.css':
      '.cb-scene__button:focus { outline: none; }\n' +
      '.cb-scene__button:focus-visible { outline: var(--ds-focus-ring) solid var(--ds-accent); }\n',
  });

  assert.ok(removed.includes('focus-visible'), 'the focus ring was removed with nothing put back');
  assert.deepEqual(replaced.filter((name) => name === 'focus-visible'), [], 'a replacement ring was refused');
});

test('an undeclared gradient is caught', () => {
  const rules = ruleFor({ 'blocks/x.css': '.x { background: linear-gradient(180deg, #fff, #000); }' });
  assert.ok(rules.includes('gradient'), 'gradient was not reported');
});

test('a declared gradient with a stated reason passes', () => {
  const results = rulesFor({
    'blocks/x.css': '.x {\n  /* ds-allow: gradient — a cast shadow has no edge. */\n  background: radial-gradient(ellipse, rgb(0 0 0 / 0.3), transparent);\n}',
  });
  assert.deepEqual(results.filter((entry) => entry.rule === 'gradient'), []);
});

for (const [kind, rule, declaration] of [
  ['length', 'scale', 'padding: 13px'],
  ['type', 'scale', 'line-height: 1'],
  ['layer', 'scale', 'z-index: -1'],
  ['color', 'theme-color', 'color: #123456'],
  ['gradient', 'gradient', 'background: linear-gradient(transparent, rgb(0 0 0 / 0.3))'],
  ['backdrop', 'glass', 'backdrop-filter: blur(3px)'],
]) {
  test(`ds-allow: ${kind} requires an exact name and a nonempty reason`, () => {
    const failures = (comment) => rulesFor({ 'blocks/x.css': `.x {\n${comment}\n${declaration};\n}` })
      .filter((entry) => entry.rule === rule);

    assert.ok(failures('').length, 'the unexcused declaration must fail');
    assert.deepEqual(failures(`/* ds-allow: ${kind} — intentional local geometry. */`), []);
    for (const marker of [kind + 'Typo', kind + '-extra', 'unknown', kind.toUpperCase()]) {
      assert.ok(failures(`/* ds-allow: ${marker} — intentional local geometry. */`).length, marker);
    }
    for (const comment of [
      `/* ds-allow: ${kind} */`,
      `/* ds-allow: ${kind} — */`,
      `/*\n * ds-allow: ${kind} —\n *\n */`,
    ]) assert.ok(failures(comment).length, comment);
  });
}

test('ds-allow accepts long multiline reasons and declarations, including comment punctuation', () => {
  const reason = 'Physical light falloff; the {print} uses * shading. '.repeat(12);
  const css = `.x {\n/*\n * ds-allow: gradient — ${reason}\n * The second line explains the material.\n */\n` +
    `background:\n${' '.repeat(300)}linear-gradient(transparent, rgb(0 0 0 / 0.3));\n}`;
  assert.deepEqual(ruleFor({ 'blocks/x.css': css }), []);
});

test('ds-allow applies to every matching value in one declaration, but not the next declaration', () => {
  const css = `.x {\n/* ds-allow: color — two inks belong to this print. */\n` +
    `box-shadow: 0 0 #123456, 0 0 #654321;\ncolor: #abcdef;\n}`;
  const colors = rulesFor({ 'blocks/x.css': css }).filter((entry) => entry.rule === 'theme-color');
  assert.equal(colors.length, 1);
  assert.match(colors[0].detail, /#abcdef/);
});

test('ds-allow does not cross selectors, declarations or an inline value', () => {
  for (const css of [
    '/* ds-allow: length — intentional. */\n.x { padding: 13px; }',
    '.x {\n/* ds-allow: length — intentional. */\ndisplay: block;\npadding: 13px; }',
    '.x { padding: /* ds-allow: length — intentional. */ 13px; }',
    '.x { content: "/* ds-allow: length — intentional. */"; padding: 13px; }',
    '.x { /* ordinary comment */ padding: 13px; }',
  ]) assert.ok(ruleFor({ 'blocks/x.css': css }).includes('scale'), css);
});

test('ds-allow can combine distinct exceptions for the same adjacent declaration', () => {
  const css = `.x {\n/* ds-allow: gradient — light falling on paper. */\n` +
    `/* ds-allow: color — the print uses its own inks. */\n` +
    `background: linear-gradient(#123456, #654321);\n}`;
  assert.deepEqual(ruleFor({ 'blocks/x.css': css }), []);
});

test('ds-allow only suppresses its named check, not unrelated rules', () => {
  const css = `.x {\n/* ds-allow: gradient — light falling on paper. */\n` +
    `background: linear-gradient(#123456, #654321);\n}`;
  const rules = ruleFor({ 'blocks/x.css': css });
  assert.ok(!rules.includes('gradient'));
  assert.ok(rules.includes('theme-color'));
  assert.ok(ruleFor({ 'blocks/x.css': '/* ds-allow: layer — intentional. */\n@layer custom { .x { display: grid; } }' }).includes('layer'));
});

test('comment text cannot introduce effects or stand in for reduced-motion behavior', () => {
  const css = '.x { /* linear-gradient( and backdrop-filter: are discussed here. */\n' +
    'transition: opacity var(--ds-duration-fast); /* prefers-reduced-motion */\n}';
  const rules = ruleFor({ 'blocks/x.css': css });
  assert.ok(!rules.includes('gradient'));
  assert.ok(!rules.includes('glass'));
  assert.ok(rules.includes('reduced-motion'));
});

test('an invalid exception still reports the declaration after a long comment', () => {
  const css = `.x { display: grid;\n/* ds-allow: lengthTypo — ${'reason '.repeat(80)} */\npadding: 13px; }`;
  const failures = rulesFor({ 'blocks/x.css': css }).filter((entry) => entry.rule === 'scale');
  assert.equal(failures.length, 1);
  assert.match(failures[0].detail, /padding: 13px/);
});
