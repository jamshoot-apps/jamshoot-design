/**
 * How a component is declared.
 *
 * Every component in this library takes exactly one object and declares every option
 * it accepts, down to the shape of the rows inside a list. That buys three things:
 *
 *   - A typo is a build error, not a silently missing paragraph. `card({ bodyText })`
 *     stops the build and names the option it meant.
 *   - There is no argument order to remember, for a person or for a model. Every call
 *     in the system reads `name({ … })`.
 *   - The declaration is the documentation. `scripts/docs.mjs` prints the options table
 *     from this spec and `scripts/llms.mjs` prints the signature, so the three can never
 *     describe different components.
 *
 * Error messages name the component, the path to the offending option, the valid
 * set, and a package-relative Markdown page.
 */

import { isRaw } from './html.js';
import { iconNames } from './icons.js';

/* --- option types --------------------------------------------------------------- */

function kindOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'an array';
  return typeof value;
}

/**
 * The `markup` types are for the `<a>` and `<em>` a sentence carries, not for
 * structure: the component draws the paragraph, the list and the heading itself. A
 * block element typed into one of them lands inside the element the renderer already
 * made — an `<h3>` in a lead, a `<p>` inside a `<p>` — which no validator downstream
 * can tell apart from a component's own markup.
 */
const BLOCK_TAG =
  /<(h[1-6]|p|div|section|article|aside|header|footer|main|nav|ul|ol|li|dl|dt|dd|table|thead|tbody|tr|td|th|figure|figcaption|blockquote|form|hr)\b/i;

function checkInline(value) {
  const found = value.match(BLOCK_TAG);

  return found
    ? `inline markup only — <${found[1].toLowerCase()}> is a block element, and the component draws its own`
    : null;
}

/** Shared by `lines` and `markupLines`: a list of strings, and not an empty one. */
function checkLines(value, what, inline = false) {
  if (!Array.isArray(value)) {
    return `an array of ${what}, got ${kindOf(value)}`;
  }

  if (!value.length) {
    return 'a non-empty array — an empty list renders an empty shell nobody notices';
  }

  if (!value.every((entry) => typeof entry === 'string')) {
    return `an array of ${what}`;
  }

  return inline ? value.map(checkInline).find(Boolean) ?? null : null;
}

function isContent(value) {
  if (Array.isArray(value)) {
    return value.every((entry) => entry == null || entry === false || isContent(entry));
  }

  /*
   * A string, or markup this library produced. Not "any object with a toString" —
   * every object has one, so that test accepted a plain object and printed
   * `[object Object]` into the page.
   */
  return typeof value === 'string' || isRaw(value);
}

/**
 * `check` returns null when the value is acceptable, or a phrase completing
 * "must be …". Optional options accept null/undefined/false, which every renderer in
 * the system already reads as "omit this".
 *
 * `summary` says what the type is for, and `scope` who declares it: `component` types
 * are what `defineComponent` options are made of, `config` types only appear in
 * `src/config.js`. Both are here rather than in prose because
 * `docs/adding-a-component.md` prints the table from this object — a type added
 * without a summary shows up as a blank cell in the page, and `npm test` refuses a
 * page whose table is not what the generator writes.
 */
export const TYPES = {
  icon: {
    summary: 'An icon name: a built-in icon or an SVG in the `JAMSHOOT_ICONS_DIR` directory.',
    describe: () => 'icon name',
    check: (value) => {
      const names = iconNames();
      return names.includes(value) ? null : `one of ${names.map((name) => `"${name}"`).join(', ')} — set JAMSHOOT_ICONS_DIR to add icons`;
    },
  },
  /** Plain words. Escaped on the way out, so it can never inject markup. */
  text: {
    summary: 'Plain words. Escaped on the way out, so it can never carry markup.',
    describe: () => 'string',
    check: (value) => (typeof value === 'string' ? null : `a string, got ${kindOf(value)}`),
  },

  /**
   * Words that may carry inline markup — the `<a>` and `<em>` a content file needs.
   * Not escaped. It is only ever fed from content/, and a static site has no visitor
   * input, which is what makes this safe rather than merely convenient.
   */
  markup: {
    summary: 'Words that carry an inline link or emphasis. Not escaped.',
    describe: () => 'string (inline HTML allowed)',
    check: (value) => (typeof value === 'string' ? checkInline(value) : `a string, got ${kindOf(value)}`),
  },

  /**
   * A destination, or null while it does not exist yet.
   *
   * It was `text` with a different name — the same check, differing only in what the
   * docs table said — which is the kind of type that teaches a reader to expect a
   * guarantee nobody is giving. Two things are checked, and only two.
   *
   * Whitespace and quotes, because an href carrying either is a mistake every time:
   * the quote would be escaped into the attribute and the space is what
   * percent-encoding is for. Rejecting it first is also what stops `java\nscript:`
   * from reading as a relative path here and as a scheme in the browser.
   *
   * And the three schemes that execute instead of navigating. That is a deny-list
   * rather than an allow-list on purpose: an allow-list would have to guess at
   * `itms-apps:`, `tel:` and whatever a store link looks like next year, and a rule
   * that fails a legitimate destination teaches people to distrust the validator.
   */
  url: {
    summary: 'A destination, or null while it does not exist yet. Refuses whitespace and executable schemes.',
    describe: () => 'string',
    check: (value) => {
      if (typeof value !== 'string') return `a string, got ${kindOf(value)}`;

      if (/[\s"'<>\u0000-\u001f]/.test(value)) {
        return 'a destination with no spaces or quotes in it — percent-encode them';
      }

      return /^(?:javascript|data|vbscript):/i.test(value)
        ? 'a destination a page can navigate to, not a scheme that runs code'
        : null;
    },
  },

  /** A relative HTML destination below dist/. */
  pagePath: {
    scope: 'config',
    summary: 'Where a page is written below dist/.',
    describe: () => 'relative .html path',
    check: (value) => {
      if (typeof value !== 'string') return `a string, got ${kindOf(value)}`;

      const parts = value.split('/');
      return value.endsWith('.html') && !value.startsWith('/') && !value.includes('\\') &&
        parts.every((part) => part && part !== '.' && part !== '..')
        ? null
        : `a relative .html path below dist/ — got "${value}"`;
    },
  },

  /** An anchor target: what a link within the page points at. */
  id: {
    summary: 'An anchor target, so the thing can be linked to directly.',
    describe: () => 'string',
    check: (value) =>
      typeof value !== 'string'
        ? `a string, got ${kindOf(value)}`
        : /^[a-z][a-z0-9-]*$/.test(value)
          ? null
          : `lowercase letters, digits and hyphens — got "${value}"`,
  },

  /** Anything this library returns, or a string. One node or a list of them. */
  content: {
    summary: 'Another component call, a string, or a list of them.',
    describe: () => 'component call, string, or array of them',
    check: (value) => (isContent(value) ? null : `renderable content, got ${kindOf(value)}`),
  },

  /** The non-empty list a page renderer hands to <main>. */
  sections: {
    scope: 'config',
    summary: 'What a page renderer puts inside <main>.',
    describe: () => 'non-empty array of component calls',
    check: (value) =>
      !Array.isArray(value)
        ? `an array, got ${kindOf(value)}`
        : !value.length
          ? 'a non-empty array — a page must put something inside <main>'
          : value.every((entry) => entry == null || entry === false || isRaw(entry))
            ? null
            : 'an array of renderable component calls',
  },

  function: {
    scope: 'config',
    summary: 'A function the build calls — a page’s render.',
    describe: () => 'function',
    check: (value) => (typeof value === 'function' ? null : `a function, got ${kindOf(value)}`),
  },

  json: {
    scope: 'config',
    summary: 'Structured data printed into the page head as-is.',
    describe: () => 'JSON object or array',
    check: (value) =>
      value && typeof value === 'object' ? null : `a JSON object or array, got ${kindOf(value)}`,
  },

  /** A list of rows. `of` declares the shape of one row and is checked the same way. */
  items: {
    summary: 'A non-empty list of rows. `of` declares one row’s shape, checked field by field.',
    describe: (option) => (option.of ? `non-empty array of { ${Object.keys(option.of).join(', ')} }` : 'non-empty array of objects'),
    check: (value) =>
      !Array.isArray(value)
        ? `an array, got ${kindOf(value)}`
        : !value.length
          ? 'a non-empty array — an empty list renders an empty shell nobody notices'
          : value.every((entry) => entry && typeof entry === 'object' && !Array.isArray(entry))
            ? null
            : 'an array of objects',
  },

  /** One nested object. `of` declares its shape and is checked the same way. */
  shape: {
    summary: 'One nested object. `of` declares it, checked field by field.',
    describe: (option) => `{ ${Object.keys(option.of).join(', ')} }`,
    check: (value) =>
      value && typeof value === 'object' && !Array.isArray(value) ? null : `an object, got ${kindOf(value)}`,
  },

  /** A list of strings — bullet points, feature lines, a row of cells. Escaped. */
  lines: {
    summary: 'A non-empty list of strings — bullet points, feature lines. Escaped.',
    describe: () => 'non-empty array of strings',
    check: (value) => checkLines(value, 'strings'),
  },

  /**
   * The same list, unescaped — the paragraphs of a policy, the cells of a spec table.
   * Split from `lines` so that "this text is printed as markup" is declared where a
   * reader can see it, rather than being a property of whichever renderer got it.
   */
  markupLines: {
    summary: 'A non-empty list of strings, unescaped — the paragraphs of a policy.',
    describe: () => 'non-empty array of strings (inline HTML allowed)',
    check: (value) => checkLines(value, 'strings', true),
  },

  /** A list of lists of strings — table rows. Cells may carry inline markup. */
  markupRows: {
    summary: 'A non-empty list of non-empty table rows. A cell may carry inline markup.',
    describe: () => 'non-empty array of non-empty arrays of strings (inline HTML allowed)',
    check: (value) =>
      !Array.isArray(value)
        ? `an array, got ${kindOf(value)}`
        : !value.length
          ? 'a non-empty array — an empty list renders an empty shell nobody notices'
          : value.every((row) => Array.isArray(row) && row.length && row.every((cell) => typeof cell === 'string'))
            ? value.flat().map(checkInline).find(Boolean) ?? null
            : 'an array of non-empty arrays of strings',
  },

  /**
   * A line, or a function that is handed one value and returns it — the copyright
   * notice, which needs the current year and must not be a hard-coded one.
   */
  template: {
    scope: 'config',
    summary: 'A line, or a function handed one value that returns one.',
    describe: () => 'string, or a function returning one',
    check: (value) =>
      typeof value === 'string' || typeof value === 'function' ? null : `a string or a function, got ${kindOf(value)}`,
  },

  boolean: {
    summary: 'Itself. `false` is an answer, not an omission.',
    describe: () => 'true or false',
    check: (value) => (typeof value === 'boolean' ? null : `true or false, got ${kindOf(value)}`),
  },

  number: {
    summary: 'Itself, and finite.',
    describe: () => 'number',
    check: (value) =>
      typeof value === 'number' && Number.isFinite(value) ? null : `a number, got ${kindOf(value)}`,
  },

  /**
   * One of a fixed set. The set is always printed in the error, so a wrong value never
   * has to be looked up. `describeAs` shortens how it reads in the docs table and in
   * llms.txt — the icon set is two dozen names, and printing them beside every option
   * that takes one spends a context window on a list the page already carries.
   */
  enum: {
    summary: 'One of a fixed set, declared in `values`. The set is printed in the error.',
    describe: (option) => option.describeAs ?? option.values.map((value) => `"${value}"`).join(' | '),
    check: (value, option) =>
      option.values.includes(value) ? null : `one of ${option.values.map((v) => `"${v}"`).join(', ')}`,
  },
};

/* --- did you mean --------------------------------------------------------------- */

function distance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;

    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }

  return row[b.length];
}

/**
 * Suggests a name only when it is close enough to be a typo rather than a guess.
 *
 * Two shapes of mistake matter here. A slip — `titel` for `title` — is caught by edit
 * distance. A different word for the same thing — `bodyText` for `body`, `iconName`
 * for `icon` — is not close by that measure but starts the same way, which is the
 * commonest way a model gets an option name wrong.
 */
function nearest(word, candidates) {
  const lower = word.toLowerCase();
  const prefixed = candidates.filter(
    (candidate) => lower.startsWith(candidate.toLowerCase()) || candidate.toLowerCase().startsWith(lower),
  );

  if (prefixed.length) {
    return prefixed.sort((a, b) => b.length - a.length)[0];
  }

  const ranked = candidates
    .map((candidate) => ({ candidate, score: distance(lower, candidate.toLowerCase()) }))
    .sort((a, b) => a.score - b.score)[0];

  return ranked && ranked.score <= Math.max(2, Math.floor(word.length / 3)) ? ranked.candidate : null;
}

/* --- validation ----------------------------------------------------------------- */

export class ComponentError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ComponentError';
  }
}

/**
 * Validates `given` against `options`, returning a new object with defaults filled in
 * and omitted values normalised to null. `path` prefixes the error message, so a bad
 * row reports as `sections[2].title` rather than `title`.
 */
function validate(given, options, fail, path = '') {
  const names = Object.keys(options);
  const list = names.map((key) => `${key}:`).join(' ');

  if (given === null || typeof given !== 'object' || Array.isArray(given)) {
    fail(path ? `"${path.slice(0, -1)}" must be an object — ${list}` : `takes one options object — ${list}`);
  }

  for (const key of Object.keys(given)) {
    if (names.includes(key)) {
      continue;
    }

    const suggestion = nearest(key, names);
    fail(
      `unknown option "${path}${key}".${suggestion ? ` Did you mean "${suggestion}"?` : ''}` +
        ` Valid options: ${names.join(', ')}.`,
    );
  }

  const resolved = {};

  for (const [key, option] of Object.entries(options)) {
    const value = given[key];

    /*
     * `false` reads as "omit this" everywhere in the system — `icon && icon(…)` — so
     * an optional value may be written that way. The one place it cannot mean that is
     * a `boolean` option, where `false` is the answer: taken as an omission it would
     * be replaced by the default, and a knob declared `default: true` could never be
     * turned off.
     */
    const omitted = value === undefined || value === null || (value === false && option.type !== 'boolean');

    if (omitted) {
      if (option.required) {
        fail(`"${path}${key}" is required (${TYPES[option.type].describe(option)}).`);
      }

      resolved[key] = option.default ?? null;
      continue;
    }

    const problem = TYPES[option.type].check(value, option);

    if (problem) {
      fail(`"${path}${key}" must be ${problem}.`);
    }

    if (option.type === 'items' && option.of) {
      resolved[key] = value.map((entry, index) => validate(entry, option.of, fail, `${path}${key}[${index}].`));
    } else if (option.type === 'shape' && option.of) {
      resolved[key] = validate(value, option.of, fail, `${path}${key}.`);
    } else {
      resolved[key] = value;
    }
  }

  return resolved;
}

/* --- constraints ----------------------------------------------------------------- */

/**
 * Some rules are about two options at once — a card says one thing, so it takes a
 * body or a list and not both. They are declared beside the options, not thrown from
 * inside `render`, so the docs table and `llms.txt` print them and the page cannot
 * call both options optional while the build refuses the pair.
 *
 * A constraint is `{ describe, check }`. `describe` is one line, printed everywhere
 * the options are printed; `check` returns null or the sentence that completes the
 * error. Both halves come from the same declaration, so they cannot disagree.
 */
export const constraint = (describe, check) => ({ describe, check });

const listed = (names, mark = '`', word = 'or') => names.map((name) => `${mark}${name}${mark}`).join(` ${word} `);

/**
 * At most one of these. Both is a contradiction; neither is a thing with less in it,
 * which is a choice the caller is allowed to make.
 */
export const atMostOne = (names, why) =>
  constraint(`at most one of ${listed(names)} — ${why}`, (given) =>
    names.filter((name) => given[name] != null).length > 1 ? `takes ${listed(names, '"')}, not both — ${why}` : null,
  );

/** At least one of these has to be there; more than one is fine. */
export const atLeastOne = (names, why) =>
  constraint(`at least one of ${listed(names)} — ${why}`, (given) =>
    given && names.some((name) => given[name] != null) ? null : `needs ${listed(names, '"')} — ${why}`,
  );

/**
 * Both or neither: two options that are one fact between them, and that do nothing
 * apart. An image's intrinsic width without its height reserves no space at all.
 */
export const together = (names, why) =>
  constraint(`${listed(names, '`', 'and')} together — ${why}`, (given) => {
    const set = names.filter((name) => given[name] != null);

    return !set.length || set.length === names.length
      ? null
      : `needs ${listed(names, '"', 'and')} together, or neither — ${why}`;
  });

/** `b` is only meaningful with `a`, and is required as soon as `a` is there. */
export const requiredWith = (option, other, why) =>
  constraint(`\`${option}\` whenever \`${other}\` is set — ${why}`, (given) =>
    given[other] != null && given[option] == null ? `needs "${option}" when "${other}" is set — ${why}` : null,
  );

/* --- the definition ------------------------------------------------------------- */

/**
 * `defineComponent('card', { summary, docs, options, constraints, styles, render })`
 *
 * `options` maps a name to `{ type, required, values, of, default, summary }`.
 * `constraints` are the rules that span two options. `styles: false` is the explicit
 * declaration for a component that needs no stylesheet; every other component owns
 * `<name>.css`. `render` receives the validated object with defaults filled in and
 * every omitted option normalised to null, and returns markup.
 */
export function defineComponent(name, { summary, docs, options, constraints = [], styles = true, runtime = [], render }) {
  const reference = docs?.startsWith('docs/')
    ? `https://jamshoot-apps.github.io/jamshoot-design/${docs.slice(5, -3).replaceAll('/', '-')}.html`
    : docs;
  const where = reference ? ` See ${reference}.` : '';
  const fail = (message) => {
    throw new ComponentError(`${name}(): ${message}${where}`);
  };

  const component = (given = {}) => {
    const resolved = validate(given, options, fail);

    for (const rule of constraints) {
      const problem = rule.check(resolved);

      if (problem) {
        fail(problem);
      }
    }

    return render(resolved, fail);
  };

  component.componentName = name;
  component.spec = { name, summary, docs, options, constraints, styles, runtime };

  return component;
}

/**
 * The same declaration for an object that is not a component: `site.config.js`.
 *
 * It is checked exactly like a set of options — same "did you mean", same path into a
 * nested row — and hands the validated object back instead of markup. A config was
 * the one file in a site that nothing checked, and it is the file every page reads.
 */
export const defineShape = (name, spec) => defineComponent(name, { ...spec, render: (resolved) => resolved });

/** Prints `card({ title, body, icon?, media? })` for the docs and for llms.txt. */
export function signature({ name, options }) {
  const printed = Object.entries(options)
    .map(([key, option]) => (option.required ? key : `${key}?`))
    .join(', ');

  return `${name}({ ${printed} })`;
}

/** Describes one option's accepted shape, for the docs table. */
export function describeType(option) {
  return TYPES[option.type].describe(option);
}

/** Every defined component, so docs, llms.txt and the tests can enumerate the API. */
export function specOf(value) {
  return typeof value === 'function' && value.spec ? value.spec : null;
}
