import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const LIB = fileURLToPath(new URL('../../', import.meta.url));
const run = (cwd, command, args, input) => spawnSync(command, args, { cwd, input, encoding: 'utf8' });

function repository() {
  const path = mkdtempSync(join(tmpdir(), 'ds-hooks-'));
  run(path, 'git', ['init', '-q']);
  run(path, 'git', ['config', 'user.name', 'Test']);
  run(path, 'git', ['config', 'user.email', 'test@example.com']);
  writeFileSync(join(path, 'package.json'), '{"version":"0.2.0","scripts":{"test":"node gate.mjs"}}\n');
  writeFileSync(join(path, 'gate.mjs'), 'process.exit(0);\n');
  writeFileSync(join(path, 'CHANGELOG.md'), '## [Unreleased]\n\n## [0.2.0] — 2026-09-09\n');
  run(path, 'git', ['add', '.']);
  run(path, 'git', ['commit', '-qm', 'initial']);
  return path;
}

test('pre-commit requires package version and latest release to match', (t) => {
  const repo = repository();
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const hook = join(LIB, '.githooks/pre-commit');
  assert.equal(run(repo, hook, []).status, 0);

  writeFileSync(join(repo, 'package.json'), '{"version":"0.3.0"}\n');
  run(repo, 'git', ['add', 'package.json']);
  assert.equal(run(repo, hook, []).status, 1);
});

test('pre-commit refuses a failing npm test even when release metadata matches', (t) => {
  const repo = repository();
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const hook = join(LIB, '.githooks/pre-commit');
  writeFileSync(join(repo, 'gate.mjs'), 'process.exit(1);\n');
  run(repo, 'git', ['add', 'gate.mjs']);
  assert.notEqual(run(repo, hook, []).status, 0);
  writeFileSync(join(repo, 'gate.mjs'), 'process.exit(0);\n');
  run(repo, 'git', ['add', 'gate.mjs']);
  assert.equal(run(repo, hook, []).status, 0);
});

test('pre-commit cannot validate an unstaged fix instead of the staged failure', (t) => {
  const repo = repository();
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const hook = join(LIB, '.githooks/pre-commit');
  writeFileSync(join(repo, 'gate.mjs'), 'process.exit(1);\n');
  run(repo, 'git', ['add', 'gate.mjs']);
  writeFileSync(join(repo, 'gate.mjs'), 'process.exit(0);\n');
  const blocked = run(repo, hook, []);
  assert.equal(blocked.status, 1);
  assert.match(blocked.stderr, /stage or set aside/);
  run(repo, 'git', ['add', 'gate.mjs']);
  assert.equal(run(repo, hook, []).status, 0);
  writeFileSync(join(repo, 'untracked.test.mjs'), 'throw new Error("not in index");\n');
  assert.equal(run(repo, hook, []).status, 1);
});

test('pre-push requires an annotated release tag in the same push', (t) => {
  const repo = repository();
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const hook = join(LIB, '.githooks/pre-push');
  const old = run(repo, 'git', ['rev-parse', 'HEAD']).stdout.trim();
  writeFileSync(join(repo, 'package.json'), '{"version":"0.3.0"}\n');
  writeFileSync(join(repo, 'CHANGELOG.md'), '## [Unreleased]\n\n## [0.3.0] — 2026-09-09\n');
  run(repo, 'git', ['add', '.']);
  run(repo, 'git', ['commit', '-qm', 'release']);
  const head = run(repo, 'git', ['rev-parse', 'HEAD']).stdout.trim();
  const branch = `refs/heads/main ${head} refs/heads/main ${old}\n`;

  assert.equal(run(repo, hook, ['origin', 'unused'], branch).status, 1);
  run(repo, 'git', ['tag', 'v0.3.0']);
  assert.equal(run(repo, hook, ['origin', 'unused'], branch).status, 1);
  run(repo, 'git', ['tag', '-d', 'v0.3.0']);
  run(repo, 'git', ['tag', '-am', 'Release 0.3.0', 'v0.3.0']);
  const tag = run(repo, 'git', ['rev-parse', 'v0.3.0']).stdout.trim();
  const tagged = `${branch}refs/tags/v0.3.0 ${tag} refs/tags/v0.3.0 ${'0'.repeat(40)}\n`;
  assert.equal(run(repo, hook, ['origin', 'unused'], tagged).status, 0);
});
