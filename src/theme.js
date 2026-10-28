/**
 * The one line that has to run before the page is painted.
 *
 * Everything else about the theme is CSS or a deferred script, and both are fine
 * arriving late. A stored choice is not: applied after the first paint, it is a
 * reader who picked light watching a dark page flash past on every navigation. So the
 * page carries this in its head — no source, no fetch, three statements — and the
 * rest of the work stays in `src/runtime/theme.js`.
 *
 * It names no theme either. The stored value is a theme name, and the only thing
 * checked here is that it still looks like one: a value somebody hand-edited into
 * storage cannot put arbitrary text in an attribute, and a name the page no longer
 * has is corrected by the runtime a moment later.
 *
 * The attribute, the key and the shape of a name all come from `src/tokens/contract.js`,
 * so this file cannot drift apart from the CSS the build emits. `src/runtime/theme.js`
 * runs in a browser and cannot import the contract, so it spells the same two strings
 * out a second time; what holds those together is
 * `src/components/atoms/themeToggle/themeToggle.test.mjs`, which runs the runtime
 * in a browser mock and checks that it reads and writes these contract values.
 */

import { THEME_ATTRIBUTE, THEME_NAME, THEME_STORAGE_KEY } from './tokens/contract.js';
import { h } from './html.js';

const literal = (value) => JSON.stringify(value);

export const themeBoot = () =>
  h('script', {
    html:
      `try{var c=localStorage.getItem(${literal(THEME_STORAGE_KEY)});` +
      `if(c&&${THEME_NAME.toString()}.test(c))` +
      `document.documentElement.setAttribute(${literal(THEME_ATTRIBUTE)},c)}catch(e){}`,
  });
