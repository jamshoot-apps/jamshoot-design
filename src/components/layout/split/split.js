import { defineComponent } from '../../../define.js';
import { h } from '../../../html.js';

export const split = defineComponent('split', {
  summary: 'Two columns on a wide screen, one on a narrow one. Copy beside an illustration.',
  docs: 'src/components/layout/split/README.md',
  options: {
    start: { type: 'content', required: true, summary: 'The first region in source and reading order.' },
    end: { type: 'content', required: true, summary: 'The second region.' },
  },
  render: ({ start, end }) => h('div', { class: 'ds-split' }, [h('div', {}, start), h('div', {}, end)]),
});
