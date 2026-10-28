import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { THEME_ATTRIBUTE, THEME_STORAGE_KEY } from '../../../tokens/contract.js';
import { themeToggle } from './themeToggle.js';

const runtime = readFileSync(new URL('../../../runtime/theme.js', import.meta.url), 'utf8');

const control = (...choices) =>
  String(themeToggle({ label: 'Theme', choices: [{ label: 'Auto', icon: 'contrast-outline' }, ...choices] }));

/**
 * The rendered control is the runtime's only source of states, so what is worth
 * checking here is that the markup carries everything the browser half looks for —
 * and that the browser half looks for nothing else, because anything else would be a
 * list of themes living somewhere a site cannot change by adding a file.
 */
test('the runtime reads its states out of the markup rather than a list of its own', () => {
  const markup = control({ palette: 'dark', label: 'Dark', icon: 'moon-outline' });

  assert.match(markup, /data-theme-toggle/);
  assert.match(markup, /data-theme-option data-active/, 'the page does not arrive following the system');
  assert.match(markup, /data-theme-option="dark"/);

  const options = ['', 'paper', 'warm-paper'].map((name) => {
    const attributes = new Map([['data-theme-option', name]]);
    return {
      getAttribute: (key) => attributes.get(key),
      hasAttribute: (key) => attributes.has(key),
      toggleAttribute: (key, enabled) => enabled ? attributes.set(key, '') : attributes.delete(key),
    };
  });
  const attributes = new Map();
  const storage = new Map([[THEME_STORAGE_KEY, 'warm-paper']]);
  let click;
  runInNewContext(runtime, {
    document: {
      querySelector: (selector) => {
        assert.equal(selector, '[data-theme-toggle]');
        return {
          querySelectorAll: (selector) => { assert.equal(selector, '[data-theme-option]'); return options; },
          addEventListener: (event, handler) => { assert.equal(event, 'click'); click = handler; },
        };
      },
      documentElement: {
        setAttribute: (key, value) => { assert.equal(key, THEME_ATTRIBUTE); attributes.set(key, value); },
        removeAttribute: (key) => { assert.equal(key, THEME_ATTRIBUTE); attributes.delete(key); },
      },
    },
    localStorage: {
      getItem: (key) => { assert.equal(key, THEME_STORAGE_KEY); return storage.get(key); },
      setItem: (key, value) => { assert.equal(key, THEME_STORAGE_KEY); storage.set(key, value); },
      removeItem: (key) => { assert.equal(key, THEME_STORAGE_KEY); storage.delete(key); },
    },
  });
  assert.equal(attributes.get(THEME_ATTRIBUTE), 'warm-paper');
  assert.ok(options[2].hasAttribute('data-active'));
  click();
  assert.ok(!attributes.has(THEME_ATTRIBUTE));
  assert.ok(!storage.has(THEME_STORAGE_KEY));
  click();
  assert.equal(attributes.get(THEME_ATTRIBUTE), 'paper');
  assert.equal(storage.get(THEME_STORAGE_KEY), 'paper');
});

test('a palette the site added is offered without the component being told what it is', () => {
  const markup = control(
    { palette: 'default', label: 'Daylight', icon: 'sunny-outline' },
    { palette: 'warm-paper', label: 'Warm paper', icon: 'eye-outline' },
  );

  assert.match(markup, /data-theme-option="warm-paper"/);
  assert.ok(markup.includes('Theme: Warm paper'), 'a palette carries no name of its own into the control');
  assert.ok(markup.includes('ds-icon--eye-outline'), 'a palette cannot choose the icon it is shown with');
});

/*
 * A name that is only the state cannot be acted on: "Theme: Dark" is either the theme
 * you have or the one you would get, and a reader who cannot see the icon has no way
 * to tell. The next state is in the name because `choices` is the cycle order.
 */
test('the accessible name says what one click does, not only where the reader is', () => {
  const markup = control(
    { palette: 'default', label: 'Light', icon: 'sunny-outline' },
    { palette: 'dark', label: 'Dark', icon: 'moon-outline' },
  );

  assert.ok(markup.includes('Theme: Auto. Switch to Light.'), 'the first state does not name the second');
  assert.ok(markup.includes('Theme: Light. Switch to Dark.'));
  assert.ok(markup.includes('Theme: Dark. Switch to Auto.'), 'the last state does not wrap round to the first');

  const translated = String(
    themeToggle({
      label: 'Appearance \u2600',
      action: 'Activate',
      choices: [
        { label: 'System', icon: 'contrast-outline' },
        { palette: 'dark', label: 'Night', icon: 'moon-outline' },
      ],
    }),
  );

  assert.ok(translated.includes('Appearance \u2600: System. Activate Night.'), 'the sentence is not translatable');
});

test('the state the reader is in is the accessible name, and the other states are not drawn', () => {
  const markup = control({ palette: 'dark', label: 'Dark', icon: 'moon-outline' });
  const css = readFileSync(new URL('themeToggle.css', import.meta.url), 'utf8');

  assert.ok(markup.includes('Theme: Auto') && markup.includes('Theme: Dark'), 'a state carries no name of its own');
  assert.equal(markup.match(/data-active/g).length, 1, 'more than one state is in force at once');
  assert.match(css, /\.ds-theme-toggle__option\s*\{\s*display:\s*none;/);
  assert.match(css, /\.ds-theme-toggle__option\[data-active\]/, 'which state is drawn is a selector per palette');
});
