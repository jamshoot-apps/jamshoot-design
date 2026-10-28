import { defineComponent } from '../../../define.js';
import { h } from '../../../html.js';
import { chip } from '../../atoms/chip/chip.js';

export const proof = defineComponent('proof', {
  summary: 'Short factual claims under a hero. Each one has to be checkable.',
  docs: 'src/components/molecules/proof/README.md',
  options: {
    items: {
      type: 'items',
      required: true,
      summary: 'The claims. Around three is a content guideline, not a checked limit.',
      of: {
        term: { type: 'text', required: true, summary: 'The claim, in three or four words.' },
        value: { type: 'markup', summary: 'The sentence that makes it checkable. May carry an inline link.' },
      },
    },
    style: {
      type: 'enum',
      values: ['stacked', 'pills'],
      default: 'stacked',
      summary: '`pills` drops the expansion line and shows each term as a chip().',
    },
  },
  render: ({ items, style }) =>
    // Pills have terms and nothing to define them by, so they are a list, not a <dl>.
    style === 'pills'
      ? h(
          'ul',
          { class: 'ds-proof ds-proof--pills', role: 'list' },
          items.map((item) => h('li', { class: 'ds-proof__item' }, chip({ label: item.term }))),
        )
      : h(
          'dl',
          { class: 'ds-proof' },
          items.map((item) =>
            h('div', { class: 'ds-proof__item' }, [
              h('dt', { class: 'ds-proof__term', text: item.term }),
              item.value && h('dd', { class: 'ds-proof__text', html: item.value }),
            ]),
          ),
        ),
});
