import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { docPages } from '../../scripts/tables.mjs';
import { specOf } from '../../src/define.js';
import { siteConfig } from '../../src/config.js';
import { llmsText } from '../../scripts/llms.mjs';
import { LIB } from '../support/library.mjs';
import { components } from '../support/components.mjs';

/**
 * Every path this package hands a reader has to resolve.
 *
 * `llms.txt` and every component error end in "see this file", and both are read by
 * something that cannot go looking for the file it meant — a renamed page turns the
 * one map of the system into a dead end, silently, because nothing else reads a link.
 */
test('every file llms.txt and the components point at exists', () => {
  const dangling = [];
  const check = (path, where) => {
    if (!existsSync(join(LIB, path.split('#')[0]))) {
      dangling.push(`${path} — ${where}`);
    }
  };

  for (const [, path] of llmsText().matchAll(/\]\(((?:docs|src|tokens)\/[^)]+)\)/g)) {
    check(path, 'linked from llms.txt');
  }

  // The page each component names in its errors, `siteConfig` included.
  for (const spec of [...components.map(([, value]) => specOf(value)), specOf(siteConfig)]) {
    check(spec.docs, `${spec.name} points at it`);
  }

  assert.deepEqual(dangling, [], 'a documentation link goes nowhere');
});

test('relative Markdown links resolve inside the package', () => {
  const pages = [join(LIB, 'README.md'), join(LIB, 'CHANGELOG.md'), ...docPages()];
  const dangling = [];

  for (const page of new Set(pages)) {
    const source = readFileSync(page, 'utf8');

    for (const [, href] of source.matchAll(/(?<!!)\[[^\]]+\]\(([^)]+)\)/g)) {
      const path = href.split('#')[0];

      if (!path || /^(?:[a-z]+:|\/)/i.test(path)) continue;

      if (!existsSync(join(page, '..', path))) {
        dangling.push(`${page.slice(LIB.length)} → ${href}`);
      }
    }
  }

  assert.deepEqual(dangling, [], 'a packaged Markdown link goes nowhere');
});
