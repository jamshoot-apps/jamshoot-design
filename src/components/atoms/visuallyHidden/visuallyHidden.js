import { defineComponent } from '../../../define.js';
import { h } from '../../../html.js';

export const visuallyHidden = defineComponent('visuallyHidden', {
  summary: 'Text for screen readers that is not drawn on screen.',
  /* `.ds-visually-hidden` is a base utility: controls inside the library clip their
   * own state text with it, and an atom may not import another atom to do that. */
  styles: false,
  docs: 'src/components/atoms/visuallyHidden/README.md',
  options: {
    text: { type: 'text', required: true, summary: 'What is read aloud.' },
  },
  render: ({ text }) => h('span', { class: 'ds-visually-hidden', text }),
});
