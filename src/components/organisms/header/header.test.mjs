import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { header } from './header.js';
import { brand } from '../../atoms/brand/brand.js';
import { themeToggle } from '../../atoms/themeToggle/themeToggle.js';

test('links without a current page id are not marked as the current page', () => {
  const options = { brand: brand({ text: 'Example' }), links: [{ label: 'Home', href: 'index.html' }, { id: 'support', label: 'Support', href: 'support.html' }] };
  assert.doesNotMatch(String(header(options)), /aria-current/);
  const current = String(header({ ...options, activeId: 'support' }));
  assert.equal((current.match(/aria-current="page"/g) ?? []).length, 1);
});

test('the header opts into scroll hiding without changing the default', () => {
  const base = { brand: brand({ text: 'Example', compact: true }), links: [{ label: 'Home', href: 'index.html' }] };
  for (const hideOnScroll of [undefined, false, true]) {
    const markup = String(header({ ...base, hideOnScroll }));
    assert.equal(markup.includes('data-hide-on-scroll'), hideOnScroll === true);
    assert.doesNotMatch(markup, /data-scroll-hidden/, 'the header must start visible without JavaScript');
  }
});

test('scroll direction reveals the header, with guards for interaction and scroll bounce', () => {
  const events = {};
  const frames = [];
  const attributes = new Set();
  let menuOpen = false;
  let mobile = true;
  let toggleClick;
  const toggleAttributes = new Map([['aria-controls', 'ds-nav'], ['aria-expanded', 'false']]);
  const toggle = {
    getAttribute: (name) => toggleAttributes.get(name),
    setAttribute: (name, value) => toggleAttributes.set(name, value),
    getClientRects: () => mobile ? [{}] : [],
    addEventListener: (name, fn) => { if (name === 'click') toggleClick = fn; },
  };
  const nav = {
    toggleAttribute: (name, on) => { if (name === 'data-open') menuOpen = on; },
    removeAttribute: (name) => { if (name === 'data-open') menuOpen = false; },
    addEventListener: () => {},
  };
  const chrome = {
    offsetHeight: 64,
    contains: (element) => element === chrome,
    querySelector: () => menuOpen ? {} : null,
    addEventListener: (name, fn) => { events[name] = fn; },
    removeAttribute: (name) => attributes.delete(name),
    toggleAttribute: (name, on) => on ? attributes.add(name) : attributes.delete(name),
  };
  const document = {
    activeElement: null,
    documentElement: { scrollHeight: 2400 },
    querySelector: (selector) => selector === '[data-hide-on-scroll]' ? chrome : toggle,
    getElementById: () => nav,
    addEventListener: () => {},
  };
  const window = {
    scrollY: 0,
    innerHeight: 800,
    requestAnimationFrame: (fn) => frames.push(fn),
    addEventListener: (name, fn) => { events[name] = fn; },
  };
  const runtime = readFileSync(new URL('../../../runtime/nav.js', import.meta.url), 'utf8');
  runInNewContext(runtime, { document, window });
  const hidden = () => attributes.has('data-scroll-hidden');
  const scroll = (y) => {
    window.scrollY = y;
    events.scroll();
    frames.shift()();
  };

  scroll(40);
  assert.equal(hidden(), false, 'the header stays visible near the top');
  scroll(300);
  assert.equal(hidden(), true);
  scroll(297);
  assert.equal(hidden(), true, 'tiny upward jitter must not flash the header');
  scroll(292);
  assert.equal(hidden(), false, 'upward movement reveals without reaching the top');
  scroll(350);
  assert.equal(hidden(), true);
  toggleClick();
  scroll(400);
  assert.equal(hidden(), false, 'an open menu stays visible');
  events.resize();
  assert.equal(menuOpen, true, 'a resize within mobile must not close the menu');
  mobile = false;
  events.resize();
  assert.equal(menuOpen, false, 'desktop layout must clear the mobile open state');
  assert.equal(toggleAttributes.get('aria-expanded'), 'false');
  scroll(450);
  assert.equal(hidden(), true, 'the header hides again after switching to desktop');
  document.activeElement = chrome;
  scroll(500);
  assert.equal(hidden(), false, 'focused controls stay visible');
  document.activeElement = null;
  scroll(600);
  events.focusin();
  assert.equal(hidden(), false, 'tabbing into a hidden header reveals it');
  scroll(700);
  events.pageshow();
  assert.equal(hidden(), false, 'history restoration starts visible');
  scroll(1600);
  scroll(1700);
  scroll(1600);
  assert.equal(hidden(), true, 'bottom overscroll is not an upward scroll');
  scroll(1580);
  assert.equal(hidden(), false);
  scroll(-100);
  assert.equal(hidden(), false);

  window.scrollY = 500;
  events.scroll();
  events.scroll();
  assert.equal(frames.length, 1, 'scroll work is coalesced into one frame');
  frames.shift()();

  runInNewContext(runtime, {
    document: { querySelector: () => null },
    window: { addEventListener: () => assert.fail('disabled header registered scroll listeners') },
  });
});

test('the header shows the configured tagline without making the mobile menu part of its height', () => {
  const markup = String(
    header({ brand: brand({ text: 'Example', tagline: 'Useful tagline', compact: true }), links: [{ label: 'Home', href: 'index.html' }] }),
  );
  const css = readFileSync(new URL('header.css', import.meta.url), 'utf8');

  /* The lockup is the atom: the template places brand() and styles none of it. */
  assert.match(markup, /class="ds-brand ds-brand--compact"/, 'the header rendered a lockup of its own again');
  assert.match(markup, /ds-brand__tagline">Useful tagline/);
  assert.doesNotMatch(css, /ds-header__brand/, 'a second lockup is being styled beside the one brand() owns');
  assert.match(css, /\.ds-header__nav\s*\{[^}]*position:\s*absolute;[^}]*top:\s*100%;/s);
  assert.doesNotMatch(css.match(/\.ds-header__bar\s*\{[^}]*\}/s)[0], /flex-wrap/);
});

test('the theme control is in the header only when the site asks for it', () => {
  const base = { brand: brand({ text: 'Example', compact: true }), links: [{ label: 'Home', href: 'index.html' }] };
  const plain = String(header(base));
  const themed = String(header({ ...base, theme: themeToggle({ choices: [{ label: 'Auto', icon: 'contrast-outline' }, { label: 'Dark', icon: 'moon-outline', palette: 'dark' }] }) }));

  assert.doesNotMatch(plain, /ds-theme-toggle/, 'a site with one palette got a control for two');
  assert.match(themed, /ds-theme-toggle/);
  /* Above 52rem the menu button is gone and the theme control is not, so they are siblings, not nested. */
  assert.doesNotMatch(themed, /ds-header__toggle"[^>]*>\s*<button class="[^"]*ds-theme-toggle/);
});

test('Escape closes an open mobile menu and moves focus to the toggle only when focus was in the menu', () => {
  const listeners = {};
  const toggleAttributes = new Map([['aria-controls', 'ds-nav'], ['aria-expanded', 'false']]);
  const menuAttributes = new Set();
  const link = {};
  let toggleClick;
  const toggle = {
    getAttribute: (name) => toggleAttributes.get(name),
    setAttribute: (name, value) => toggleAttributes.set(name, value),
    getClientRects: () => [{}],
    addEventListener: (name, fn) => { if (name === 'click') toggleClick = fn; },
    focus: () => { document.activeElement = toggle; },
  };
  const nav = {
    toggleAttribute: (name, on) => { if (name === 'data-open') on ? menuAttributes.add(name) : menuAttributes.delete(name); },
    removeAttribute: (name) => menuAttributes.delete(name),
    addEventListener: () => {},
    contains: (element) => element === link,
  };
  const document = {
    activeElement: null,
    querySelector: (selector) => selector === '[data-nav-toggle]' ? toggle : null,
    getElementById: () => nav,
    addEventListener: (name, fn) => { listeners[name] = fn; },
  };
  runInNewContext(readFileSync(new URL('../../../runtime/nav.js', import.meta.url), 'utf8'), {
    document,
    window: { addEventListener: () => {} },
  });
  const press = (overrides) => {
    const event = { key: 'Escape', defaultPrevented: false, isComposing: false, prevented: false, preventDefault() { this.prevented = true; }, ...overrides };
    listeners.keydown(event);
    return event;
  };
  const open = () => menuAttributes.has('data-open');

  toggleClick();
  document.activeElement = link;
  press({ key: 'Enter' });
  assert.equal(open(), true, 'only Escape dismisses the menu');
  press({ defaultPrevented: true });
  assert.equal(open(), true, 'an Escape another handler consumed is ignored');
  press({ isComposing: true });
  assert.equal(open(), true, 'Escape during IME composition is ignored');
  press();
  assert.equal(open(), false, 'Escape closes the menu');
  assert.equal(toggleAttributes.get('aria-expanded'), 'false');
  assert.equal(document.activeElement, toggle, 'focus leaves the hidden link for the toggle');

  toggleClick();
  document.activeElement = toggle;
  press();
  assert.equal(open(), false);
  assert.equal(document.activeElement, toggle);

  const elsewhere = {};
  toggleClick();
  document.activeElement = elsewhere;
  press();
  assert.equal(open(), false);
  assert.equal(document.activeElement, elsewhere, 'focus outside the menu is not moved');

  document.activeElement = link;
  press();
  assert.equal(open(), false, 'Escape with the menu closed does not open it');
  assert.equal(document.activeElement, link, 'Escape with the menu closed does not steal focus');
  assert.equal(toggleAttributes.get('aria-expanded'), 'false');
});
