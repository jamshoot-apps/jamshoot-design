import * as ds from '../../src/index.js';
import * as markup from '../../src/markup.js';
import { escape } from '../../src/html.js';
import { page } from '../../src/templates.js';
import { fencedBlocks } from './fences.mjs';

// Authored examples are trusted expressions, evaluated against the real library.
export function runExample(code, overrides = {}) {
  const scope = { ...ds, ...markup, page, ...overrides };
  const names = Object.keys(scope);
  const factory = new Function(...names, `return (${code.trim()});`);

  return String(factory(...names.map((name) => scope[name])));
}

export function exampleBlocks(source) {
  return [...fencedBlocks(source)]
    .filter((block) => block.kind === 'example' && block.closed)
    .map(({ body }) => body.length ? `${body.join('\n')}\n` : '');
}

export const renderExample = (code, title) =>
  `<div class="example">${title ? `<p class="example__label">${escape(title)}</p>` : ''}` +
  `<div class="example__stage">${runExample(code)}</div>` +
  `<pre class="example__source"><code>${escape(code.trim())}</code></pre></div>`;
