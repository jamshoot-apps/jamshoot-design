import { defineComponent } from '../../../define.js';
import { h, modifier } from '../../../html.js';

export const container = defineComponent('container', {
  summary: 'The one thing that decides how wide the page is.',
  docs: 'src/components/layout/container/README.md',
  options: {
    content: { type: 'content', required: true, summary: 'What sits inside the measure.' },
    width: {
      type: 'enum',
      values: ['default', 'narrow'],
      default: 'default',
      summary: '`narrow` is the reading measure, for legal and support pages.',
    },
  },
  render: ({ content, width }) =>
    h('div', { class: ['ds-container', modifier('ds-container', width, 'default')] }, content),
});
