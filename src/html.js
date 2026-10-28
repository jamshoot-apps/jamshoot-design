/**
 * Markup helpers. Everything here returns a string — pages are rendered once at
 * build time, never in the browser.
 *
 * `h(tag, props, children)` has the shape of a DOM builder, so page code reads like
 * the tree it produces. `text` and `html` are the two special props: `text` escapes,
 * `html` does not.
 */

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img',
  'input', 'link', 'meta', 'source', 'track', 'wbr',
]);

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Renderers pass `false`/`null` for "omit this", so a condition can sit inline: `flag && h(…)`. */
function isOmitted(value) {
  return value === null || value === undefined || value === false;
}

export function escape(value) {
  return String(value).replace(/[&<>"']/g, (character) => ESCAPES[character]);
}

/**
 * Marks a string as already-safe markup. Content files use it for the handful of
 * places that carry inline `<em>`/`<a>`, and components use it to nest each other.
 */
export function raw(value) {
  return new Raw(String(value));
}

/**
 * The brand that says "this library made this node". A registry symbol rather than
 * the class itself, because a site can hold two copies of the library at once — the
 * runners import the worktree while the site's own `pages.js` resolves the installed
 * package — and `instanceof` is per copy, so one copy would refuse the other's markup.
 */
const RAW = Symbol.for('jamshoot.design.raw');

class Raw {
  constructor(value) {
    this.value = value;
  }

  toString() {
    return this.value;
  }
}

Raw.prototype[RAW] = true;

/**
 * Whether a value is markup this library produced. `defineComponent` checks it, so
 * `prose({ content: { a: 1 } })` is a build error and not `[object Object]` in the
 * page: every object has a `toString`, so testing for one would accept anything.
 */
export function isRaw(value) {
  return Boolean(value) && value[RAW] === true;
}

/** `class: ['card', featured && 'card--featured']` — falsy entries drop out. */
function classValue(value) {
  return Array.isArray(value) ? value.filter(Boolean).join(' ') : value;
}

function renderChild(child) {
  if (isOmitted(child)) {
    return '';
  }

  if (isRaw(child)) {
    return String(child);
  }

  if (Array.isArray(child)) {
    return child.map(renderChild).join('');
  }

  return escape(child);
}

function renderAttributes(props) {
  let markup = '';

  for (const [key, value] of Object.entries(props)) {
    if (isOmitted(value) || key === 'text' || key === 'html') {
      continue;
    }

    if (value === true) {
      markup += ` ${key}`;
      continue;
    }

    // An empty class is noise; an empty alt is a decorative image, and load-bearing.
    if (key === 'class') {
      const joined = classValue(value);

      if (joined) {
        markup += ` class="${escape(joined)}"`;
      }

      continue;
    }

    markup += ` ${key}="${escape(value)}"`;
  }

  return markup;
}

/** Build an element from props and children. Returns a `Raw`, so it nests directly. */
export function h(tag, props = {}, children = []) {
  const open = `<${tag}${renderAttributes(props)}>`;

  if (VOID_TAGS.has(tag)) {
    return raw(open);
  }

  let body = '';

  if (props.html !== undefined && !isOmitted(props.html)) {
    body = String(props.html);
  } else if (props.text !== undefined && !isOmitted(props.text)) {
    body = escape(props.text);
  }

  body += renderChild([children].flat());

  return raw(`${open}${body}</${tag}>`);
}

/** Joins a list of nodes with no separator. For templates assembling sections. */
export function fragment(children) {
  return raw(renderChild([children].flat()));
}

/**
 * Every heading in finished markup, one level down. What a wrapper owes content it
 * has put a heading of its own above: a group titled `h3` holding cards titled `h3`
 * is two things claiming the same rank, and a screen reader reads the outline flat.
 *
 * It rewrites rendered markup rather than asking each component for a level, which
 * would be the same option on `card`, `steps`, `plan`, `faq` and everything added
 * after them — a knob at every call site to say what the nesting already says.
 *
 * Only real elements are rewritten. A heading typed into a text option was escaped on
 * the way in (`&lt;h3&gt;`), an attribute value likewise, and an inline markup option
 * refuses block tags outright — so a `<h3` left in the string is one a renderer wrote.
 * `h6` has nowhere to go and stays where it is, which is the signal that a page is
 * nested deeper than a landing page has any business being.
 */
export function demoteHeadings(content) {
  return raw(renderChild([content].flat()).replace(/<(\/?)h([1-5])\b/g, (_, slash, level) => `<${slash}h${+level + 1}`));
}

/** `modifier('ds-stack', gap, 'sm')` — a BEM modifier class, or `false` at the default. */
export function modifier(base, value, fallback) {
  return value !== fallback && `${base}--${value}`;
}
