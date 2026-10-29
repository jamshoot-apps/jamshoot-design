import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { iconNames, iconSource } from '../../src/icons.js';
import { LIB } from '../support/library.mjs';

test('every icon is drawn in currentColor at one viewBox', () => {
  const names = iconNames();
  assert.ok(names.length > 0, 'no icons were discovered');

  for (const name of names) {
    const svg = iconSource(name);
    const root = svg.match(/<svg[^>]*>/)[0];

    assert.match(root, /viewBox="0 0 512 512"/, `${name} is not on the 512 grid`);
    assert.doesNotMatch(svg, /#[0-9a-fA-F]{3,6}/, `${name} names a color`);
    // A width on the root would beat the CSS; a width on a <rect> inside it is the artwork.
    assert.doesNotMatch(root, /\swidth="/, `${name} carries a fixed width`);
  }
});

test('a vendored asset directory carries its license and checksums', () => {
  for (const directory of ['src/assets/icons', 'docs/assets/icons']) {
    const files = readdirSync(join(LIB, directory));
    assert.ok(files.includes('LICENSE.txt'), `${directory} has no license`);
    assert.ok(files.includes('MANIFEST.sha256'), `${directory} has no checksums`);
    const entries = readFileSync(join(LIB, directory, 'MANIFEST.sha256'), 'utf8').trim().split('\n').map((line) => line.split(/\s+/));
    assert.deepEqual(entries.map(([, name]) => name).sort(), files.filter((name) => name.endsWith('.svg')).sort());
    for (const [hash, name] of entries) {
      assert.equal(createHash('sha256').update(readFileSync(join(LIB, directory, name))).digest('hex'), hash, name);
    }
  }
});
