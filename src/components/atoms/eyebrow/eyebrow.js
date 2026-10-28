import { defineComponent } from '../../../define.js';
import { h } from '../../../html.js';

export const eyebrow = defineComponent('eyebrow', {
  summary: 'The small line above a title that says which part of the page this is.',
  docs: 'src/components/atoms/eyebrow/README.md',
  options: {
    text: { type: 'text', required: true, summary: 'Two or three words. Not a sentence.' },
  },
  render: ({ text }) => h('p', { class: 'ds-eyebrow', text }),
});
