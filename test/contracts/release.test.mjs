import assert from 'node:assert/strict';
import { test } from 'node:test';
import { read } from '../support/library.mjs';

/*
 * The release workflow reads CHANGELOG.md by splitting on level-two headings. It
 * refuses to tag unless the first section is [Unreleased] with no entries left in it,
 * and the second is the dated section for package.json's version with non-empty notes.
 * Contributors add entries under [Unreleased] during development, so the emptiness
 * rule is enforced only by the workflow at release time. These tests repeat the
 * layout checks against the real files, so a changelog edit that would break a
 * release fails here first. They also pin the workflow's own guards, so the two
 * cannot drift apart without a test noticing.
 */

const sectionsOf = (changelog) => changelog.split(/^## /m).slice(1);

test('github-release.yml still enforces the changelog layout this test mirrors', () => {
  const workflow = read('.github/workflows/github-release.yml');

  assert.ok(
    workflow.includes("readFileSync('CHANGELOG.md', 'utf8').split(/^## /m).slice(1)"),
    'github-release.yml no longer splits CHANGELOG.md on ## headings; update test/contracts/release.test.mjs',
  );
  assert.ok(
    workflow.includes(String.raw`assert.match(sections[0], /^\[Unreleased\]/);`),
    'github-release.yml no longer asserts that the first section is [Unreleased]; update test/contracts/release.test.mjs',
  );
  assert.ok(
    workflow.includes('sections[1]?.startsWith(`[${version}] — `)'),
    'github-release.yml no longer asserts the release heading; update test/contracts/release.test.mjs',
  );
  assert.ok(
    workflow.includes(String.raw`assert.equal(sections[0].replace(/^\[Unreleased\][^\n]*\n/, '').trim(), '',`),
    'github-release.yml no longer requires an empty [Unreleased] section at release time; update test/contracts/release.test.mjs',
  );
});

test('the package version is a stable X.Y.Z release that the workflow can tag', () => {
  const { version } = JSON.parse(read('package.json'));

  assert.match(version, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
});

test('CHANGELOG.md starts with an [Unreleased] section, which may hold entries during development', () => {
  const sections = sectionsOf(read('CHANGELOG.md'));

  assert.ok(sections.length >= 1, 'CHANGELOG.md has no ## sections');
  assert.match(sections[0], /^\[Unreleased\]/, 'the first ## section must be [Unreleased]');
});

test('the newest dated changelog section matches package.json and has release notes', () => {
  const { version } = JSON.parse(read('package.json'));
  const sections = sectionsOf(read('CHANGELOG.md'));

  assert.ok(
    sections[1]?.startsWith(`[${version}] — `),
    `the second ## section must start with [${version}] — to match package.json`,
  );

  const notes = sections[1].slice(sections[1].indexOf('\n') + 1).trim();

  assert.ok(notes, 'Release notes must not be empty');
});
