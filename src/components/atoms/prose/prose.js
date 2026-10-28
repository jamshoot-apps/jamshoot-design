import { defineComponent } from '../../../define.js';
import { h } from '../../../html.js';

export const prose = defineComponent('prose', {
  summary: 'The one place bare elements get spacing, because the author is writing sentences.',
  docs: 'src/components/atoms/prose/README.md',
  options: {
    content: { type: 'content', required: true, summary: 'Paragraphs, lists and tables, in reading order.' },
  },
  render: ({ content }) => h('div', { class: 'ds-prose' }, content),
});
