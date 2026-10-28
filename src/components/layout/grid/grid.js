import { defineComponent } from '../../../define.js';
import { h, modifier } from '../../../html.js';
import { measureSteps, spaceSteps } from '../../../tokens/contract.js';

export const grid = defineComponent('grid', {
  summary: 'Cards laid out in as many columns as the width allows.',
  docs: 'src/components/layout/grid/README.md',
  options: {
    content: { type: 'content', required: true, summary: 'The cells. Usually a list of card() calls.' },
    /*
     * `columns` before this, which promised a number and took "default" or "wide" —
     * the first thing anyone writes is `columns: 3`, and a fixed count is the one
     * thing this grid deliberately does not do. What it takes is the width a cell
     * may shrink to before a column drops, which is a step on the measure scale.
     */
    cell: {
      type: 'enum',
      values: measureSteps('xs', 'md'),
      default: 'xs',
      summary: 'How narrow a cell may get before the grid drops a column. `md` suits cards with media.',
    },
    gap: { type: 'enum', values: spaceSteps('md', 'lg'), default: 'md', summary: 'A step on the spacing scale.' },
  },
  /* Two scales on one base, so the cell modifier names its axis: --lg is the gap's. */
  render: ({ content, cell, gap }) =>
    h('div', { class: ['ds-grid', cell !== 'xs' && `ds-grid--cell-${cell}`, modifier('ds-grid', gap, 'md')] }, content),
});
