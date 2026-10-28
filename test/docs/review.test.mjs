import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { componentFingerprint, fingerprint, reviewFailure, reviewMarker, reviews, staleReviews } from '../../scripts/docs-review.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { LIB } from '../support/library.mjs';

test('component code and CSS have an explicit current documentation review', () => {
  assert.deepEqual(
    staleReviews().map(({ name }) => name),
    [],
    'component docs need review — run `npm run docs:review -- --check` for exact paths',
  );
});

test('header, footer, configuration and build documentation gates detect every owned source change', () => {
  const targets = reviews();
  const build = targets.find((entry) => entry.name === 'build');
  for (const path of ['src/cli/output.js', 'src/cli/files.js', 'src/cli/colours.js', 'scripts/docs/build.mjs']) {
    assert.ok(build.dependencies.includes(join(LIB, path)), `${path} escaped build documentation review`);
  }
  for (const name of ['header', 'footer', 'siteConfig', 'build']) {
    const entry = targets.find((item) => item.name === name);
    assert.ok(entry, `${name} escaped documentation discovery`);
    const sources = [entry.source, entry.stylesheet, ...(entry.dependencies ?? []),
      ...(entry.runtime ?? []).map((module) => join(LIB, 'src/runtime', `${module}.js`))].filter(Boolean);
    for (const changed of sources) {
      const after = componentFingerprint(entry, (path, encoding) => readFileSync(path, encoding) + (path === changed ? '\n// changed without docs review\n' : ''));
      assert.notEqual(after, entry.marker?.fingerprint, `${changed} changed without invalidating ${entry.docs}`);
    }
  }
  const covered = new Set(targets.flatMap((entry) => [
    ...(entry.dependencies ?? []), ...(entry.runtime ?? []).map((module) => join(LIB, 'src/runtime', `${module}.js`)),
  ]));
  for (const name of readdirSync(join(LIB, 'src/runtime')).filter((name) => name.endsWith('.js'))) {
    assert.ok(covered.has(join(LIB, 'src/runtime', name)), `${name} has no documentation owner`);
  }
});

test('the documentation review marker detects source drift', () => {
  const before = fingerprint([['card.js', 'one']]);
  const after = fingerprint([['card.js', 'two']]);
  const marker = reviewMarker(`<!-- docs-review: ${before}; reason: Existing behavior documented. -->`);

  assert.notEqual(before, after);
  assert.equal(marker.fingerprint, before);
  assert.notEqual(marker.fingerprint, after);

  const message = reviewFailure({
    name: 'card',
    source: join(LIB, 'src/components/molecules/card/card.js'),
    stylesheet: join(LIB, 'src/components/molecules/card/card.css'),
    docs: join(LIB, 'src/components/molecules/card/README.md'),
    current: after,
    marker,
  });
  assert.match(message, /card\.js \+ src\/components\/molecules\/card\/card\.css/);
  assert.match(message, /src\/components\/molecules\/card\/README\.md/);
  assert.match(message, /npm run docs:review -- card --reason/);
});
