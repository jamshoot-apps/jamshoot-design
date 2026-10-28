import { defineComponent } from '../../../define.js';
import { h } from '../../../html.js';

export const steps = defineComponent('steps', {
  summary: 'A numbered process. The number is the only ornament a step gets.',
  docs: 'src/components/molecules/steps/README.md',
  options: {
    items: {
      type: 'items',
      required: true,
      summary: 'The steps, in order. Numbering is automatic.',
      of: {
        title: { type: 'text', required: true, summary: 'What this step is.' },
        body: { type: 'markup', required: true, summary: 'What happens in it. May carry an inline link.' },
      },
    },
  },
  render: ({ items }) =>
    h(
      'ol',
      { class: 'ds-steps' },
      items.map((item, index) =>
        h('li', { class: 'ds-step' }, [
          h('span', { class: 'ds-step__index', text: String(index + 1).padStart(2, '0') }),
          h('h3', { class: 'ds-step__title', text: item.title }),
          h('p', { class: 'ds-step__body', html: item.body }),
        ]),
      ),
    ),
});
