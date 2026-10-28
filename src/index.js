/**
 * What a site is allowed to call.
 *
 * Everything here takes one options object and validates it, so a page is a list of
 * named regions rather than a tree of hand-written elements. There is deliberately no
 * `h()` in this list: raw markup is a block's business, and a block imports it from
 * `@jamshoot-apps/design/markup`. `src/cli/lint.mjs` fails a page that reaches for it.
 *
 * Start with the compact `llms.txt` catalog, then open a component's local README.
 * Every option is checked at build time with the valid set in the error.
 *
 * Each component owns a folder under `src/components/<tier>/`, with one export line
 * here per renderer. `test/contracts/components.test.mjs` checks that this list and the discovered
 * component folders name exactly the same set.
 */

/* Layout — how things are arranged. */
export { container } from './components/layout/container/container.js';
export { cluster } from './components/layout/cluster/cluster.js';
export { grid } from './components/layout/grid/grid.js';
export { split } from './components/layout/split/split.js';
export { stack } from './components/layout/stack/stack.js';

/* Atoms — the pieces that carry no layout of their own. */
export { badge } from './components/atoms/badge/badge.js';
export { brand } from './components/atoms/brand/brand.js';
export { button } from './components/atoms/button/button.js';
export { chip } from './components/atoms/chip/chip.js';
export { eyebrow } from './components/atoms/eyebrow/eyebrow.js';
export { icon } from './components/atoms/icon/icon.js';
export { iconTile } from './components/atoms/iconTile/iconTile.js';
export { navToggle } from './components/atoms/navToggle/navToggle.js';
export { note } from './components/atoms/note/note.js';
export { prose } from './components/atoms/prose/prose.js';
export { themeToggle } from './components/atoms/themeToggle/themeToggle.js';
export { visuallyHidden } from './components/atoms/visuallyHidden/visuallyHidden.js';

/* Molecules — a few atoms with a shape. */
export { card } from './components/molecules/card/card.js';
export { definitions } from './components/molecules/definitions/definitions.js';
export { faq } from './components/molecules/faq/faq.js';
export { figure } from './components/molecules/figure/figure.js';
export { plan } from './components/molecules/plan/plan.js';
export { proof } from './components/molecules/proof/proof.js';
export { steps } from './components/molecules/steps/steps.js';
export { table } from './components/molecules/table/table.js';

/* Organisms — the bands a landing page is made of. */
export { cta } from './components/organisms/cta/cta.js';
export { footer } from './components/organisms/footer/footer.js';
export { header } from './components/organisms/header/header.js';
export { hero } from './components/organisms/hero/hero.js';
export { legalDocument } from './components/organisms/legalDocument/legalDocument.js';
export { pageHeader } from './components/organisms/pageHeader/pageHeader.js';
export { section } from './components/organisms/section/section.js';
export { subsection } from './components/organisms/subsection/subsection.js';

/* The set of icons that exist, so a page can be checked against it. */
export { iconNames } from './icons.js';
