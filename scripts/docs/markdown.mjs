import { escape } from '../../src/html.js';
import { GENERATORS } from '../tables.mjs';
import { fencedBlocks } from './fences.mjs';
import { cssAssembly } from './css-assembly.mjs';

export function inline(text, resolveLink = (href) => href) {
  const render = (value) => value.replace(
    /`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g,
    (_, code, label, href, bold) => {
      if (code !== undefined) return `<code>${code}</code>`;
      if (label !== undefined) return `<a href="${resolveLink(href)}">${render(label)}</a>`;
      return `<strong>${render(bold)}</strong>`;
    },
  );
  return render(escape(text));
}

// ponytail: the reference's Markdown subset; extend only for authored docs that need it.
export function renderMarkdown(source, renderExample, resolveLink = (href) => href) {
  const out = [];
  let kind = null;
  let content = [];

  const flush = () => {
    if (kind === 'paragraph') out.push(`<p>${inline(content.join(' '), resolveLink)}</p>`);
    if (kind === 'list') out.push(`<ul class="ds-prose__list">${content.join('')}</ul>`);
    if (kind === 'table') {
      const [head, ...body] = content;
      const cells = (row, tag) => row.map((cell) => `<${tag}>${inline(cell, resolveLink)}</${tag}>`).join('');
      out.push(`<div class="ds-table-scroll"><table class="ds-table"><thead><tr>${cells(head, 'th')}</tr></thead><tbody>${body.map((row) => `<tr>${cells(row, 'td')}</tr>`).join('')}</tbody></table></div>`);
    }
    kind = null;
    content = [];
  };
  const append = (next, value) => {
    if (kind !== next) flush();
    kind = next;
    content.push(value);
  };

  for (const block of fencedBlocks(source)) {
    if (typeof block !== 'string') {
      flush();
      const code = block.body.join('\n');
      if (GENERATORS[block.kind]) {
        out.push(`<div class="generated">${renderMarkdown(code, renderExample, resolveLink)}</div>`);
      } else if (block.kind === 'example') {
        out.push(renderExample(code, block.argument.match(/title="([^"]*)"/)?.[1]));
      } else if (block.kind === 'diagram' && block.argument === 'css-assembly') {
        out.push(cssAssembly());
      } else {
        out.push(`<pre><code>${escape(code)}</code></pre>`);
      }
      continue;
    }

    if (!block.trim() || /^<!--[^\n]*-->$/.test(block)) {
      flush();
      continue;
    }
    const heading = block.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      flush();
      const level = heading[1].length;
      const id = heading[2].toLowerCase().replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
      out.push(`<h${level} id="${id}">${inline(heading[2], resolveLink)}</h${level}>`);
    } else if (block.startsWith('- ')) {
      append('list', `<li>${inline(block.slice(2), resolveLink)}</li>`);
    } else if (kind === 'list' && /^\s{2,}\S/.test(block)) {
      content[content.length - 1] = content.at(-1).replace('</li>', ` ${inline(block.trim(), resolveLink)}</li>`);
    } else if (block.startsWith('|')) {
      const cells = block.split(/(?<!\\)\|/).slice(1, -1).map((cell) => cell.trim().replaceAll('\\|', '|'));
      if (!cells.every((cell) => /^-+$/.test(cell))) append('table', cells);
    } else {
      append('paragraph', block.trim());
    }
  }
  flush();
  return out.join('\n');
}
