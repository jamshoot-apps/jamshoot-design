import { defineComponent } from '../../../define.js';
import { h } from '../../../html.js';

export const chip = defineComponent('chip', {
  summary: 'A short fact that stands on its own, in sentence case. Read as content, not as a status.',
  docs: 'src/components/atoms/chip/README.md',
  options: {
    label: { type: 'text', required: true, summary: 'Two to four words — "No account", "Works offline".' },
  },
  render: ({ label }) => h('span', { class: 'ds-chip', text: label }),
});
