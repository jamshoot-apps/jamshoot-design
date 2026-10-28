import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inlineIcon } from '../../src/icons.js';

test('icon() marks decoration as hidden and labels the rest', () => {
  assert.match(String(inlineIcon('star')), /aria-hidden="true"/);
  assert.match(String(inlineIcon('star', { label: 'Rated' })), /role="img" aria-label="Rated"/);
});

test('icon labels are escaped as attribute text', () => {
  const html = String(inlineIcon('star', { label: '" onload="example & <label>' }));
  assert.match(html, /aria-label="&quot; onload=&quot;example &amp; &lt;label&gt;"/);
  assert.doesNotMatch(html, /" onload="/);
});

test('the components draw their own icons, and a site directory adds and replaces icons', async () => {
  const root = mkdtempSync(join(tmpdir(), 'ds-icons-'));
  const previous = process.env.JAMSHOOT_ICONS_DIR;
  const previousLegacy = process.env.JAMSHOOT_ICONS;
  process.env.JAMSHOOT_ICONS = join(root, 'legacy-missing');
  delete process.env.JAMSHOOT_ICONS_DIR;
  try {
    writeFileSync(join(root, 'package.json'), '{"type":"module"}');
    for (const directory of ['src']) {
      cpSync(fileURLToPath(new URL(`../../${directory}`, import.meta.url)), join(root, directory), { recursive: true });
    }
    const ds = await import(pathToFileURL(join(root, 'src/index.js')));
    assert.deepEqual(ds.iconNames(), [
      'arrow-forward', 'checkmark', 'chevron-down', 'close', 'contrast-outline', 'menu', 'moon-outline', 'sunny-outline',
    ], 'the removed JAMSHOOT_ICONS variable is ignored');
    assert.match(String(ds.navToggle({ controls: 'nav', label: 'Menu' })), /ds-icon--menu/);
    assert.throws(() => ds.icon({ name: 'star' }), /set JAMSHOOT_ICONS_DIR to add icons/);
    const icons = await import(pathToFileURL(join(root, 'src/icons.js')));
    assert.throws(() => icons.inlineIcon('star'), /Set JAMSHOOT_ICONS_DIR/);

    const directory = join(root, 'custom');
    mkdirSync(directory);
    writeFileSync(join(directory, 'star.svg'), '<svg viewBox="0 0 512 512"><path id="custom"/></svg>');
    writeFileSync(join(directory, 'menu.svg'), '<svg viewBox="0 0 512 512"><path id="site-menu"/></svg>');
    process.env.JAMSHOOT_ICONS_DIR = directory;
    assert.match(String(ds.icon({ name: 'star' })), /id="custom"/);
    assert.match(String(icons.inlineIcon('menu')), /id="site-menu"/, 'the site icon replaces the built-in one');
    assert.match(String(icons.inlineIcon('close')), /ds-icon--close/, 'built-in icons stay available');
    assert.throws(() => ds.icon({ name: '../star' }), /must be one of/);
    assert.throws(() => icons.iconSource('../star'), /not a built-in icon/);

    const other = join(root, 'other');
    mkdirSync(other);
    writeFileSync(join(other, 'menu.svg'), '<svg viewBox="0 0 512 512"><path id="other-menu"/></svg>');
    process.env.JAMSHOOT_ICONS_DIR = other;
    assert.match(icons.iconSource('menu'), /id="other-menu"/, 'the cache follows the configured directory');
    assert.ok(!ds.iconNames().includes('star'), 'names from the previous directory disappear');
    process.env.JAMSHOOT_ICONS_DIR = directory;
    assert.match(icons.iconSource('menu'), /id="site-menu"/);

    for (const invalid of [join(root, 'missing'), join(root, 'package.json')]) {
      process.env.JAMSHOOT_ICONS_DIR = invalid;
      assert.throws(() => ds.iconNames(), /JAMSHOOT_ICONS_DIR must name an existing SVG directory/);
      assert.throws(() => icons.iconSource('menu'), /JAMSHOOT_ICONS_DIR must name an existing SVG directory/);
    }
  } finally {
    if (previousLegacy === undefined) delete process.env.JAMSHOOT_ICONS;
    else process.env.JAMSHOOT_ICONS = previousLegacy;
    if (previous === undefined) delete process.env.JAMSHOOT_ICONS_DIR;
    else process.env.JAMSHOOT_ICONS_DIR = previous;
    rmSync(root, { recursive: true, force: true });
  }
});
