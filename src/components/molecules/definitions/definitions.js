import { defineComponent } from '../../../define.js';
import { h } from '../../../html.js';

export const definitions = defineComponent('definitions', {
  summary: 'Term-and-value rows: system requirements, spec sheets, anything tabular but short.',
  docs: 'src/components/molecules/definitions/README.md',
  options: {
    items: {
      type: 'items',
      required: true,
      summary: 'The rows.',
      of: {
        term: { type: 'text', required: true, summary: 'What is being specified.' },
        value: { type: 'markup', required: true, summary: 'The value. May carry an inline link.' },
      },
    },
  },
  render: ({ items }) =>
    h(
      'dl',
      { class: 'ds-definitions' },
      items.map((item) =>
        h('div', { class: 'ds-definitions__row' }, [
          h('dt', { class: 'ds-definitions__term', text: item.term }),
          h('dd', { html: item.value }),
        ]),
      ),
    ),
});
