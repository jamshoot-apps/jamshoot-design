import { defineComponent } from '../../../define.js';
import { h } from '../../../html.js';

export const badge = defineComponent('badge', {
  summary: 'A short status word beside something else. Never the only thing carrying the message.',
  docs: 'src/components/atoms/badge/README.md',
  options: {
    label: { type: 'text', required: true, summary: 'One or two words.' },
    tone: { type: 'enum', values: ['plain', 'accent'], default: 'plain', summary: 'Accent marks the one that matters.' },
  },
  render: ({ label, tone }) => h('span', { class: ['ds-badge', tone === 'accent' && 'ds-badge--accent'], text: label }),
});
