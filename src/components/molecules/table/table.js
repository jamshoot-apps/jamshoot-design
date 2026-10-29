import { constraint, defineComponent } from '../../../define.js';
import { h } from '../../../html.js';

export const table = defineComponent('table', {
  summary: 'A real table, for data that has columns. Scrolls inside itself rather than widening the page.',
  docs: 'src/components/molecules/table/README.md',
  options: {
    columns: { type: 'lines', required: true, summary: 'Column headings, left to right.' },
    rows: { type: 'markupRows', required: true, summary: 'Rows of cells, each as long as `columns`.' },
    caption: {
      type: 'text',
      summary:
        'What the table is about, drawn above it. It also names the scroll region, so a reader who tabs into it is told what they landed in.',
    },
  },
  constraints: [
    constraint('every row as long as `columns`', ({ columns, rows }) => {
      const wrong = rows.findIndex((row) => row.length !== columns.length);

      return wrong === -1
        ? null
        : `rows[${wrong}] has ${rows[wrong].length} cells but there are ${columns.length} columns`;
    }),
  ],
  render: ({ columns, rows, caption }) =>
    h(
      'div',
      {
        class: 'ds-table-scroll',
        /*
         * The box scrolls, so a keyboard has to be able to reach it: a scroll
         * container only a pointer can move hides its right-hand columns from
         * everyone else (WCAG 2.1.1). It becomes a named region only when there is a
         * caption to name it with — an unnamed region is one more unlabeled stop in
         * a screen reader's list, which is worse than no region at all.
         */
        tabindex: '0',
        role: caption ? 'region' : null,
        'aria-label': caption,
      },
      [
        h('table', { class: 'ds-table' }, [
          caption && h('caption', { class: 'ds-table__caption', text: caption }),
          h('thead', {}, h('tr', {}, columns.map((column) => h('th', { scope: 'col', text: column })))),
          h('tbody', {}, rows.map((row) => h('tr', {}, row.map((cell) => h('td', { html: cell }))))),
        ]),
      ],
    ),
});
