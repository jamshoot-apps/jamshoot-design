/**
 * Generates the compact `llms.txt` entry point. Component READMEs carry the complete
 * option tables and examples; this file only helps a reader choose which one to open.
 */

import { writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as ds from '../src/index.js';
import { signature, specOf } from '../src/define.js';
import { isMain } from '../src/cli/sites.js';
import { namesIn, TIER_NAMES, TIERS } from '../src/cli/components.js';

const LIB = fileURLToPath(new URL('../', import.meta.url));

const ORDER = {
  layout: ['container', 'stack', 'cluster', 'grid', 'split'],
  atoms: ['button', 'navToggle', 'badge', 'eyebrow', 'note', 'icon', 'iconTile', 'prose', 'brand'],
  molecules: ['card', 'steps', 'plan', 'faq', 'figure'],
  organisms: ['hero', 'section', 'subsection', 'cta', 'pageHeader', 'legalDocument', 'header', 'footer'],
};

function membersOf(tier) {
  const all = namesIn(tier).filter((name) => specOf(ds[name]));
  const ordered = (ORDER[tier] ?? []).filter((name) => all.includes(name));

  return [...ordered, ...all.filter((name) => !ordered.includes(name)).sort()];
}

function componentLine(name) {
  const spec = specOf(ds[name]);
  return `- [\`${signature(spec)}\`](${spec.docs}) — ${spec.summary}`;
}

export function llmsText() {
  const sections = TIER_NAMES.map((tier) => ({ title: TIERS[tier].title, names: membersOf(tier) }));
  const covered = new Set(sections.flatMap(({ names }) => names));
  const orphaned = Object.keys(ds).filter((name) => specOf(ds[name]) && !covered.has(name));

  if (orphaned.length) {
    throw new Error(
      `${orphaned.join(', ')} is exported from src/index.js but has no folder under src/components/<group>/<name>/`,
    );
  }

  return `# JamShoot Design

> Build-time components for static sites. A site calls validated ES-module
> functions while building; the resulting HTML and CSS ship without component
> renderers in the browser.

Fonts are site-owned; the default is the system stack. The icons the components draw
themselves are built in. \`JAMSHOOT_ICONS_DIR\` names a trusted SVG directory for content
icons; its files win over built-in ones of the same name.

## Start here

A site owns \`site.config.js\`, \`theme.css\`, \`content/*.js\`, \`pages.js\`, and
optional \`blocks/\`. [Authoring](https://jamshoot-apps.github.io/jamshoot-design/authoring.html#set-up)
provides package installation, source setup and a complete minimal site. From the library checkout:

\`\`\`sh
node src/cli/build.mjs /path/to/site
node src/cli/lint.mjs /path/to/site
\`\`\`

Discover a component here, read its linked contract, compose the page, build, lint
and correct errors. Build validates options; lint is a separate step that needs the
current output for its output checks. [Authoring](https://jamshoot-apps.github.io/jamshoot-design/authoring.html#correct-invalid-options)
shows a validation error and correction. Finish with its pre-launch checklist.

\`pages.js\` imports public functions from \`@jamshoot-apps/design\`. Each takes one object:

\`\`\`js
section({
  id: 'features',
  title: 'What it does.',
  content: grid({
    content: [card({ title: 'Offline', body: 'No account or network required.' })],
  }),
})
\`\`\`

## Authoring boundaries

- Pages call components; they do not write \`ds-*\` classes or import \`@jamshoot-apps/design/markup\`.
- Site block markup belongs in \`blocks/*.js\`; only \`blocks/*.client.js\` reaches the browser.
- A component returns static markup. Missing or invalid options stop the build and link to its README.
- User-facing strings stay in \`content/*.js\` or \`site.config.js\`.
- A site sets the twelve color roles and \`color-scheme\`; optional component tokens are closed by the contract.
- Spacing, type, radii, motion, measures and breakpoints stay library-owned.
- Component CSS owns its namespace. Composition uses parent wrappers or a documented hook.
- Option names are a closed vocabulary: \`title\` is a heading, \`label\` names a control, \`text\` is escaped words, \`body\`/\`lead\`/\`note\`/\`answer\`/\`value\` are prose carrying an inline link, \`content\` is renderable, \`items\` is a list of objects. A list of plain strings is named for the strings.

## Component catalog

Open only the component you need. Each linked README contains its generated recursive
option table, defaults, constraints, executable examples, composition notes and any
public styling hooks.

${sections.map(({ title, names }) => `### ${title}\n\n${names.map(componentLine).join('\n')}`).join('\n\n')}

## Read deeper

- [Choosing molecules](https://jamshoot-apps.github.io/jamshoot-design/molecules.html) — choose a content structure and compose it
- [Naming conventions](https://jamshoot-apps.github.io/jamshoot-design/conventions.html) — the option names components share
- [Adding a component](https://jamshoot-apps.github.io/jamshoot-design/adding-a-component.html) — the exact files, discovery and checks
- [Authoring a site](https://jamshoot-apps.github.io/jamshoot-design/authoring.html) — setup, composition, builds and pre-launch checks
- [Architecture](https://jamshoot-apps.github.io/jamshoot-design/architecture.html) — ownership and build flow
- [Token contract](src/tokens/contract.js) — roles, component tokens, defaults and cascade layers
- [Theming](https://jamshoot-apps.github.io/jamshoot-design/theming.html) — how a site supplies color
- [Rules](https://jamshoot-apps.github.io/jamshoot-design/anti-patterns.html) — every lint rule and its reason
- [Site configuration](https://jamshoot-apps.github.io/jamshoot-design/configuration.html) — validated options supplied to page components
`;
}

if (isMain(import.meta.url)) {
  const flag = process.argv.indexOf('--out');
  const out = flag === -1 ? join(LIB, 'llms.txt') : resolve(process.argv[flag + 1]);

  await writeFile(out, llmsText());
  console.log(`wrote ${out}`);
}
