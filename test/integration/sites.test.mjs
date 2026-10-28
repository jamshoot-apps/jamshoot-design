import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LIB } from '../support/library.mjs';

const FIXTURE = join(LIB, 'test/fixtures/site');

/*
 * The runner's argument handling, exercised for real. Both bugs this caught were the
 * same shape — a flag's value being mistaken for the site name — so it is checked
 * rather than read.
 */
test('the site runner finds sites by name and refuses anything else', () => {
  const dev = join(LIB, 'src/cli/dev.mjs');
  const roots = join(LIB, 'test/fixtures');
  const list = execFileSync(process.execPath, [dev, '--list', '--sites', roots], { encoding: 'utf8' });

  assert.match(list, /site/, 'the fixture site was not discovered');

  // A --port value must not be read as the site, with or without a name present.
  assert.doesNotThrow(() =>
    execFileSync(process.execPath, [dev, '--list', '--port', '4999', '--sites', roots], { stdio: 'pipe' }),
  );

  assert.throws(
    () => execFileSync(process.execPath, [dev, 'not-a-site', '--list=no', '--sites', roots], { stdio: 'pipe' }),
    /Command failed/,
    'an unknown site should exit non-zero',
  );
});

/*
 * Discovery is deliberately explicit: current site, flag, or environment. No parent
 * or sibling scan is allowed.
 */
test('sites are found from the current site, flag or environment only', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'ds-sites-'));
  const site = join(workspace, 'websites/example');

  try {
    mkdirSync(site, { recursive: true });
    writeFileSync(join(site, 'site.config.js'), 'export const site = {};\n');
    writeFileSync(join(site, 'pages.js'), 'export const pages = [];\n');

    const list = (args, env, cwd = LIB) =>
      execFileSync(process.execPath, [join(LIB, 'src/cli/dev.mjs'), '--list', ...args], {
        encoding: 'utf8',
        cwd,
        env: { ...process.env, ...env },
      });

    assert.match(list([], { JAMSHOOT_SITES: '' }, FIXTURE), /site/, 'the current site was not found');

    const unconfigured = list([], { JAMSHOOT_SITES: '' });
    assert.match(unconfigured, /Run inside a site/);
    assert.doesNotMatch(unconfigured, /sibling|neighbou?r|websites\//i);

    // Explicit roots replace that search rather than adding to it.
    const flagged = list(['--sites', join(workspace, 'websites')], { JAMSHOOT_SITES: '' });
    assert.match(flagged, /example/, '--sites was ignored');
    assert.doesNotMatch(flagged, /Run inside a site/, '--sites should replace the current-directory fallback');

    assert.match(list([], { JAMSHOOT_SITES: join(workspace, 'websites') }), /example/, 'JAMSHOOT_SITES was ignored');
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});
