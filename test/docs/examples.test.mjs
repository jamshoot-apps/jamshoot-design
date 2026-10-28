import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as designSystem from '../../src/index.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { docPages } from '../../scripts/tables.mjs';
import { specOf } from '../../src/define.js';
import { LIB, libraryStyles, read } from '../support/library.mjs';
import { components, documentedCalls } from '../support/components.mjs';
import { fencedBlocks } from '../../scripts/docs/fences.mjs';

test('the Prose block example runs with its documented public imports', async () => {
  const blocks = [...fencedBlocks(read('src/components/atoms/prose/README.md'))];
  const imports = blocks.find((block) => block.kind === 'js').body.join('\n');
  const scope = {};
  for (const [, names, path] of imports.matchAll(/import \{ ([^}]+) \} from '([^']+)'/g)) {
    const exports = await import(path);
    for (const name of names.split(',').map((value) => value.trim())) {
      assert.equal(typeof exports[name], 'function', `${name} is not exported by ${path}`);
      scope[name] = exports[name];
    }
  }
  const example = blocks.find((block) => block.kind === 'example').body.join('\n');
  const html = String(new Function(...Object.keys(scope), `return (${example});`)(...Object.values(scope)));
  assert.match(html, /class="ds-prose"/);
  assert.match(html, /<h2>Data<\/h2>/);
});

/**
 * Variant coverage lives beside the component. Each accepted enum value and both
 * boolean states must occur in a valid README example; combinations are authored,
 * never generated. Modifier classes produced by those calls must exist in the
 * assembled library CSS.
 */
test('local executable examples cover option values and their rendered modifiers', () => {
  const css = libraryStyles().map(read).join('\n');
  const problems = [];

  for (const [name, component] of components) {
    const spec = specOf(component);
    const calls = documentedCalls(name);

    if (!calls.length) {
      problems.push(`${name}: README has no example that calls ${name}()`);
      continue;
    }

    for (const [option, declared] of Object.entries(spec.options)) {
      if (declared.type !== 'boolean' && (declared.type !== 'enum' || declared.describeAs === 'icon name')) {
        continue;
      }

      const expected = declared.type === 'boolean' ? [true, false] : declared.values;
      const seen = new Set(calls.map((given) => given[option] ?? declared.default).filter((value) => value != null));

      for (const value of expected) {
        if (!seen.has(value)) problems.push(`${name}.${option}: README examples do not cover ${value}`);
      }
    }

    for (const given of calls) {
      const classes = [...String(component(given)).matchAll(/\bds-[a-z-]+--[a-z0-9-]+/g)].map(([found]) => found);

      for (const found of classes) {
        if (!found.startsWith('ds-icon--') && !css.includes(`.${found}`)) {
          problems.push(`${name}: .${found} is rendered but no library stylesheet defines it`);
        }
      }
    }
  }

  assert.deepEqual(problems, []);
});

test('every component is documented on the page it points at, with an options table', () => {
  for (const [name, component] of components) {
    const page = specOf(component).docs;
    const source = read(page);
    assert.match(source, /^## Usage\s*$/m, `${page} has no Usage section`);

    assert.match(source, new RegExp(`\`\`\`options\\s+${name}\\s`), `${page} has no options table for ${name}`);
    assert.match(source, new RegExp(`${name}\\(`), `${page} never shows ${name}() being called`);
  }
});


/*
 * Component declarations are checked in test/contracts/components.test.mjs. This
 * covers what is left: a Usage section that runs, and the handful of exports that are
 * plain helpers rather than components.
 */
test('every doc page with a Usage section runs code, and every export is documented', () => {
  const docs = docPages()
    .map((path) => ({ path, source: readFileSync(path, 'utf8') }));
  const usage = docs.flatMap(({ path, source }) =>
    [...source.matchAll(/^## Usage\s*$([\s\S]*?)(?=^##\s|(?![\s\S]))/gm)].map(([, body]) => ({ path, body })),
  );
  const usageWithoutCode = usage
    .filter(({ body }) => !/```(?:example|js|options)\b/.test(body))
    .map(({ path }) => path.slice(LIB.length));
  const everything = docs.map(({ source }) => source).join('\n');
  const undocumented = Object.keys(designSystem).filter((name) => !everything.includes(`${name}(`));

  assert.deepEqual(usageWithoutCode, [], 'Usage sections missing an example, options table or JavaScript fence');
  assert.deepEqual(undocumented, []);
});
