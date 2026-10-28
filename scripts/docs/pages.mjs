import { readdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { componentsIn, TIER_NAMES, TIERS } from '../../src/cli/components.js';

const DOCS = fileURLToPath(new URL('../../docs/', import.meta.url));
// Navigation order is a reader journey; source paths and public URLs stay stable.
const GROUPS = {
  'Start here': ['index', 'architecture', 'authoring'],
  'Build a site': ['configuration', 'theming', 'conventions', 'anti-patterns'],
  Foundations: ['foundations-colour', 'foundations-type', 'foundations-space', 'foundations-brand', 'foundations-icons', 'foundations-language', 'foundations-markup'],
  Layout: ['foundations-layout'],
  Atoms: [],
  Molecules: ['molecules'],
  Organisms: [],
  Contributing: ['adding-a-component', 'testing'],
};
const LABELS = {
  index: 'Overview',
  'anti-patterns': 'Rules and checks',
  'foundations-layout': 'Choosing a layout',
  'foundations-language': 'Interface language',
};
const ORDER = { organisms: ['hero', 'section', 'subsection', 'cta', 'pageHeader', 'legalDocument', 'header', 'footer'] };

const byOrder = (order = []) => {
  const rank = (name) => order.includes(name) ? order.indexOf(name) : order.length;
  return (a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name);
};

export function pagesToBuild() {
  const pages = [];
  for (const directory of ['', 'foundations']) {
    const entries = readdirSync(join(DOCS, directory), { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => ({ name: basename(entry.name, '.md'), path: join(DOCS, directory, entry.name) }))
      .sort(byOrder());
    for (const { name, path } of entries) {
      const slug = directory ? `${directory}-${name}` : name;
      const group = Object.keys(GROUPS).find((key) => GROUPS[key].includes(slug))
        ?? (directory ? 'Foundations' : 'Build a site');
      pages.push({ group, slug, path, navTitle: LABELS[slug] });
    }
  }
  for (const tier of TIER_NAMES) {
    for (const entry of componentsIn(tier).sort(byOrder(ORDER[tier]))) {
      pages.push({ group: TIERS[tier].title, slug: `${tier}-${entry.name}`, path: entry.docs });
    }
  }
  const groups = Object.keys(GROUPS);
  const rank = (page) => {
    const order = GROUPS[page.group];
    const index = order.indexOf(page.slug);
    return index === -1 ? order.length : index;
  };
  // Stable sorting retains the component catalog order after each group's chooser.
  return pages.sort((a, b) => groups.indexOf(a.group) - groups.indexOf(b.group)
    || rank(a) - rank(b));
}

export function resolveDocLink(href, sourcePath, slugs) {
  const [path, fragment] = href.split('#');
  if (!path.endsWith('.md')) return href;
  const slug = slugs.get(resolve(dirname(sourcePath), path));
  return slug ? `${slug}.html${fragment ? `#${fragment}` : ''}` : href;
}
