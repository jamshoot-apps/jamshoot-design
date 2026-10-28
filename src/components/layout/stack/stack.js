import { defineComponent } from '../../../define.js';
import { h, modifier } from '../../../html.js';
import { spaceSteps } from '../../../tokens/contract.js';

const GAPS = spaceSteps('2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl');

export const stack = defineComponent('stack', {
  summary: 'Children in a column with one gap between them.',
  docs: 'src/components/layout/stack/README.md',
  options: {
    content: { type: 'content', required: true, summary: 'The children, in order.' },
    gap: { type: 'enum', values: GAPS, default: 'sm', summary: 'A step on the spacing scale.' },
  },
  render: ({ content, gap }) => h('div', { class: ['ds-stack', modifier('ds-stack', gap, 'sm')] }, content),
});
