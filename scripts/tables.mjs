/**
 * The generated blocks inside Markdown pages, written into the file itself.
 *
 * `docs/` ships inside the package, so anything reading the Markdown — a person on
 * GitHub, an editor, a model with the package open — needs the options in the file
 * itself, not only on the docs site. So the table is Markdown, it lives in the
 * committed file, and `npm test` fails when it is not what this generator writes —
 * the same guard `llms.txt` has. The fence keeps the name on its opening line,
 * because it is what says the block is generated and where from:
 *
 *     ```options card
 *     … generated …
 *     ```
 *
 * `scripts/docs.mjs` renders the same Markdown to HTML rather than building a second table
 * of its own, so the page and the file cannot describe different components.
 *
 * `node scripts/tables.mjs` rewrites every page. `--check` reports instead of writing.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as ds from '../src/index.js';
import { siteConfig } from '../src/config.js';
import { describeType, specOf, TYPES } from '../src/define.js';
import { COMPONENT_TOKENS, ROLES, THEME_METADATA } from '../src/tokens/contract.js';
import { componentsIn, namesIn, TIER_NAMES } from '../src/cli/components.js';
import { filesBelow } from '../src/cli/files.js';
import { isMain } from '../src/cli/sites.js';
import { fencedBlocks } from './docs/fences.mjs';

const LIB = fileURLToPath(new URL('../', import.meta.url));
const DOCS = join(LIB, 'docs');

/* A cell is one `|`-delimited field, so a pipe inside one is escaped, as GFM does. */
const cell = (text) => String(text).replaceAll('|', '\\|');

const row = (cells) => `| ${cells.map(cell).join(' | ')} |`;

/**
 * `options card` — every option and the rules that span two of them.
 * Read from the component's own declaration, which is also what enforces them.
 */
export function optionsMarkdown(name) {
  const spec = specOf(name === 'siteConfig' ? siteConfig : ds[name]);

  if (!spec) {
    throw new Error(`docs: \`\`\`options ${name}\`\`\` names something that is not a component`);
  }

  const optionRows = (options, prefix = '') => Object.entries(options).flatMap(([key, option]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    const nestedPrefix = option.type === 'items' ? `${path}[]` : path;
    const current = row([
      `\`${path}\``,
      `\`${describeType(option)}\``,
      option.required ? 'required' : option.default != null ? `default \`${option.default}\`` : 'optional',
      option.summary ?? '',
    ]);

    return [current, ...(option.of ? optionRows(option.of, nestedPrefix) : [])];
  });

  const table = (options) => [
    row(['Option', 'Accepts', '', 'What it is']),
    row(['---', '---', '---', '---']),
    ...optionRows(options),
  ];

  // Site configuration spans several concerns; keep each group beside its explanation.
  const groups = [
    ['Site identity', ['lang', 'url', 'brand'], 'Set the document language, public origin, product name and brand images. Only `brand.name` is required in this block.'],
    ['Download and contact', ['appStore', 'contact'], 'Set the download button text and destination, support email and developer name. Both objects are optional; download buttons appear when `appStore.href` is supplied.'],
    ['Header navigation', ['nav', 'skipLink'], 'Set the header links, home destination and accessible labels. `nav.links` is required; `skipLink` labels the first link keyboard users reach, which takes them to the main content. The menu and theme icons are built in; see the [icon guide](foundations/icons.md) for custom icons.'],
    ['Footer', ['footer'], 'Set the link columns and copyright notice shown on every page. Both are required. The footer shows `contact.email` when supplied unless `footer.showContact` is false.'],
    ['Search and sharing', ['ogImage', 'jsonLd'], 'Set a default share image and structured data for all pages. Both are optional. Page titles, descriptions and additional structured data belong in [pages.js](authoring.md).'],
    ['Theme control', ['theme'], 'Enable the header theme control when the site has another palette in `themes/`. Set `theme.toggle` to true and include `theme` in `runtime`. See [Theming](theming.md) for palette files.'],
    ['Fonts', ['fonts'], 'Omit `fonts` to use the system stack with no font files emitted. To supply a typeface, set its family, fallback stack and files for each role you replace. Paths must be normalized local .woff2 paths under `assets/`, such as `assets/fonts/display.woff2`; parent segments, URL escapes, query strings and fragments are rejected.'],
    ['Browser runtime', ['runtime'], 'List the library modules loaded in the browser. The default is `["nav"]`; keep `nav` for `nav.hideOnScroll` and add `theme` for `theme.toggle`. Site files matching `blocks/*.client.js` are included automatically.'],
  ];
  const lines = [
    ...(name === 'siteConfig'
      ? groups.flatMap(([title, keys, summary]) => [
        `## ${title}`, '', summary, '',
        ...table(Object.fromEntries(keys.map((key) => [key, spec.options[key]]))), '',
      ])
      : table(spec.options)),
  ];

  if (spec.constraints.length) {
    lines.push('', 'Takes:', '', ...spec.constraints.map((rule) => `- ${rule.describe}`));
  }

  return lines.join('\n');
}

/**
 * `tokens roles`, `tokens component` and `tokens metadata` — the three lists a palette
 * file may name, each printed from the declaration the lint reads.
 *
 * A table per name rather than a chain of ternaries, so adding a fourth is adding an
 * entry — and a fence naming a table that does not exist is an error rather than
 * whichever table the last `else` happened to be.
 */
const TOKEN_TABLES = {
  roles: {
    heading: ['Token', 'What it is', 'Checked at'],
    rows: () => ROLES.map((role) => [`\`--ds-${role.name}\``, role.summary, role.min ? `${role.min}:1` : '—']),
  },
  component: {
    heading: ['Token', 'What it is', 'Accepts', 'Falls back to'],
    rows: () =>
      COMPONENT_TOKENS.map((token) => [`\`--ds-${token.name}\``, token.summary, token.accepts.summary, `\`${token.fallback}\``]),
  },
  metadata: {
    heading: ['Token', 'What it is', 'Defaults to'],
    rows: () => Object.values(THEME_METADATA).map((entry) => [`\`--ds-${entry.token}\``, entry.summary, entry.fallback]),
  },
};

export function tokensMarkdown(which) {
  const table = TOKEN_TABLES[which];

  if (!table) {
    throw new Error(`docs: \`\`\`tokens ${which}\`\`\` names no table — see scripts/tables.mjs`);
  }

  return [row(table.heading), row(table.heading.map(() => '---')), ...table.rows().map(row)].join('\n');
}

/**
 * `types component` and `types config` — what an option may be declared as.
 *
 * Generated into the docs rather than written by hand, so adding a type to
 * `src/define.js` is a one-place change that `npm test` checks. `describe` is the same
 * function that fills the "Accepts" column of every component's options table, so the
 * table and the error messages read the same way by construction.
 */
export function typesMarkdown(which) {
  const heading = ['Type', 'What it takes'];
  const rows = Object.entries(TYPES)
    .filter(([, type]) => (type.scope ?? 'component') === which)
    .map(([name, type]) => row([`\`${name}\``, type.summary]));

  return [row(heading), row(heading.map(() => '---')), ...rows].join('\n');
}

/**
 * `strings all` — every word the library puts in a page that a site did not write.
 *
 * They are the option defaults of type `text`: the menu button's name, the skip link,
 * what an empty screenshot frame says. Each one is English, and a site in another
 * language has to set all of them — which is only possible if the list is complete,
 * so it is read from the declarations rather than typed into the page. A string added
 * to a component with no translation in mind appears here on the next `npm run
 * tables`, and `npm test` fails until the page carries it.
 */
export function stringsMarkdown() {
  const heading = ['Where', 'Option', 'English'];
  const sources = [
    ['`site.config.js`', specOf(siteConfig)],
    ...TIER_NAMES.flatMap((tier) => namesIn(tier).map((name) => [`\`${name}()\``, specOf(ds[name])])),
  ];

  const rows = sources.flatMap(([where, spec]) => {
    const walk = (options, prefix = '') => Object.entries(options).flatMap(([key, option]) => {
      const path = prefix ? `${prefix}.${key}` : key;

      return [
        ...(option.type === 'text' && option.default != null
          ? [row([where, `\`${path}\``, `\`${option.default}\``])]
          : []),
        ...(option.of ? walk(option.of, path) : []),
      ];
    });

    return walk(spec.options);
  });

  return [row(heading), row(heading.map(() => '---')), ...rows].join('\n');
}

/**
 * Which fenced blocks in `docs/` are generated, and by what. `scripts/docs.mjs` renders
 * the docs site from this same map rather than keeping its own list of fence names.
 */
export const GENERATORS = {
  options: optionsMarkdown,
  tokens: tokensMarkdown,
  types: typesMarkdown,
  strings: stringsMarkdown,
};

/**
 * Rewrites every generated block in one Markdown source.
 *
 * A fence closes on a run of backticks as long as the one that opened it, which is
 * what keeps this out of the fenced block inside a fenced block that
 * docs/adding-a-component.md uses to print the template for a component page — the
 * `options` fence in there is an illustration, not a block to fill in.
 *
 * The name may be on the opening line (` ```options card `) or, as the pages were
 * first written, on the only line of the body. Both are read; the first is written.
 */
export function expand(source) {
  return [...fencedBlocks(source)].map((block) => {
    if (typeof block === 'string') return block;
    const { opening, ticks, kind, argument, body, closing } = block;
    if (!GENERATORS[kind]) return [opening, ...body, closing].join('\n');
    const name = (argument.trim() || body.join('\n').trim()).replace(/[`\s]/g, '');
    return [`${ticks}${kind} ${name}`, GENERATORS[kind](name), closing].join('\n');
  }).join('\n');
}

/** General docs plus every colocated component README. */
export function docPages(directory) {
  if (directory) {
    return filesBelow(directory, '.md');
  }

  return [
    ...filesBelow(DOCS, '.md'),
    ...TIER_NAMES.flatMap((tier) => componentsIn(tier).map(({ docs }) => docs)),
  ].sort();
}

/** The pages whose generated blocks are not what the generator writes. */
export function stalePages() {
  return docPages().filter((path) => {
    const source = readFileSync(path, 'utf8');
    return expand(source) !== source;
  });
}

if (isMain(import.meta.url)) {
  const stale = stalePages();

  if (process.argv.includes('--check')) {
    for (const path of stale) {
      console.error(`stale  ${path.slice(LIB.length)}`);
    }

    console.log(stale.length ? `\n${stale.length} pages out of date — run \`npm run tables\`` : 'up to date');
    process.exit(stale.length ? 1 : 0);
  }

  for (const path of stale) {
    writeFileSync(path, expand(readFileSync(path, 'utf8')));
  }

  console.log(stale.length ? `rewrote ${stale.length} pages` : 'up to date');
}
