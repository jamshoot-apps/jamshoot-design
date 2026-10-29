/**
 * The low-level door, for blocks only: `import { h } from '@jamshoot-apps/design/markup'`.
 *
 * A block is the one place a site writes markup the library does not know about —
 * a product demo, a brand motif. Everything else on a site is assembled from the
 * components in the main entry point, and `src/cli/lint.mjs` fails a pages.js or a
 * content file that imports this module.
 *
 * The split is the whole point: a page has a closed vocabulary that can be checked,
 * and the open-ended half is confined to a directory that is already reviewed as
 * site-specific code.
 */

export { escape, fragment, h, raw } from './html.js';
export { inlineIcon } from './icons.js';
export { defineComponent } from './define.js';
