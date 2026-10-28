import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

const source = readFileSync(new URL('../../scripts/docs/navigation.js', import.meta.url), 'utf8');

test('documentation sidebar survives navigation without moving the article or overwriting desktop position on mobile', () => {
  const storage = new Map();
  const key = 'jamshoot-docs:sidebar:/reference/';
  const page = (saved, mobile = false, blocked = false) => {
    if (saved !== undefined) storage.set(key, saved);
    const events = {};
    const media = { matches: !mobile, addEventListener: (name, callback) => { events[name] = callback; } };
    const nav = { scrollTop: 0, addEventListener: (name, callback) => { events[name] = callback; } };
    const window = {
      location: { href: 'https://example.com/reference/molecules-card.html' },
      scrollY: 0,
      matchMedia: () => media,
      addEventListener: (name, callback) => { events[name] = callback; },
      get sessionStorage() {
        if (blocked) throw new Error('Storage denied');
        return { getItem: (name) => storage.get(name) ?? null, setItem: (name, value) => storage.set(name, value) };
      },
    };
    runInNewContext(source, { document: { querySelector: () => nav }, window, URL });
    return { nav, events, media, window };
  };

  const first = page();
  first.nav.scrollTop = 1304;
  first.events.scroll();
  assert.equal(storage.get(key), '1304');
  const next = page();
  assert.equal(next.nav.scrollTop, 1304);
  assert.equal(next.window.scrollY, 0, 'the article starts independently');
  next.nav.scrollTop = 1400;
  next.events.pagehide();
  first.events.pageshow();
  assert.equal(first.nav.scrollTop, 1400, 'history navigation restores the latest sidebar position');

  const mobile = page(undefined, true);
  assert.equal(mobile.nav.scrollTop, 0);
  mobile.events.scroll();
  mobile.events.pagehide();
  assert.equal(storage.get(key), '1400', 'mobile navigation cannot overwrite desktop position');
  mobile.media.matches = true;
  mobile.events.change();
  assert.equal(mobile.nav.scrollTop, 1400);

  for (const invalid of ['NaN', '-1', 'Infinity', 'invalid']) {
    assert.equal(page(invalid).nav.scrollTop, 0);
  }
  const blocked = page(undefined, false, true);
  assert.doesNotThrow(() => { blocked.events.scroll(); blocked.events.pagehide(); blocked.events.pageshow(); });
});
