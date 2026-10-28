import { prose } from '../../atoms/prose/prose.js';
import { constraint, defineComponent } from '../../../define.js';
import { container } from '../../layout/container/container.js';
import { h } from '../../../html.js';
import { table } from '../../molecules/table/table.js';

const asParagraphs = (lines) => lines && lines.map((text) => h('p', { html: text }));
const asBullets = (lines) => lines && h('ul', {}, lines.map((line) => h('li', { html: line })));

export const legalDocument = defineComponent('legalDocument', {
  summary: 'A policy or support document: ordered sections with optional anchored headings, paragraphs, bullet lists and tables.',
  docs: 'src/components/organisms/legalDocument/README.md',
  options: {
    width: { type: 'enum', values: ['default', 'narrow'], default: 'narrow', summary: 'Match the document to the page grid or use a narrow reading column.' },
    sections: {
      type: 'items',
      required: true,
      summary: 'The clauses, in order. Each is any mix of prose, a list and a table — which is what a policy is.',
      of: {
        title: { type: 'text', summary: 'Optional clause heading. Omit for plain paragraphs.' },
        id: { type: 'id', summary: 'An anchor. Without one the heading is not linkable.' },
        paragraphs: { type: 'markupLines', summary: 'The clause itself, one string per paragraph. Each may carry inline links.' },
        list: { type: 'markupLines', summary: 'Bullet points, after the paragraphs.' },
        table: {
          type: 'shape',
          summary: 'A table, after the list.',
          of: {
            columns: { type: 'lines', required: true, summary: 'Column headings.' },
            rows: { type: 'markupRows', required: true, summary: 'Rows of cells.' },
          },
        },
        outro: { type: 'markupLines', summary: 'Paragraphs after the table.' },
      },
    },
  },
  constraints: [
    constraint('a clause with something under its heading — `paragraphs`, `list`, `table` or `outro`', ({ sections }) => {
      const empty = sections.findIndex((entry) => !entry.paragraphs && !entry.list && !entry.table && !entry.outro);

      return empty === -1
        ? null
        : `sections[${empty}] ("${sections[empty].title}") is a heading with nothing under it — give it paragraphs, a list or a table`;
    }),
  ],
  render: ({ sections, width }) =>
    h('div', { class: 'ds-document' }, [
      container({
        width,
        content: sections.map((entry) =>
          h('section', { class: 'ds-document__section', id: entry.id }, [
            entry.title && h('h2', {}, entry.id ? h('a', { href: `#${entry.id}`, text: entry.title }) : entry.title),
            h('div', { class: 'ds-document__body' }, prose({
              content: [
                asParagraphs(entry.paragraphs),
                asBullets(entry.list),
                entry.table && table(entry.table),
                asParagraphs(entry.outro),
              ],
            })),
          ]),
        ),
      }),
    ]),
});
