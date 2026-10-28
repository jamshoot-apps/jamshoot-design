import { defineComponent } from '../../../define.js';
import { h, modifier } from '../../../html.js';
import { spaceSteps } from '../../../tokens/contract.js';

export const cluster = defineComponent('cluster', {
  summary: 'Children in a row that wraps rather than scrolls. Buttons, tags, proof points.',
  docs: 'src/components/layout/cluster/README.md',
  options: {
    content: { type: 'content', required: true, summary: 'The children, in order.' },
    gap: { type: 'enum', values: spaceSteps('xs', 'sm', 'lg'), default: 'sm', summary: 'A step on the spacing scale.' },
    justify: {
      type: 'enum',
      values: ['start', 'between'],
      default: 'start',
      summary: '`between` pushes the first and last child to the edges.',
    },
  },
  render: ({ content, gap, justify }) =>
    h(
      'div',
      { class: ['ds-cluster', modifier('ds-cluster', gap, 'sm'), modifier('ds-cluster', justify, 'start')] },
      content,
    ),
});
