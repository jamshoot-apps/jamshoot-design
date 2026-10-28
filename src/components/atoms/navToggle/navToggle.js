import { defineComponent } from '../../../define.js';
import { h } from '../../../html.js';
import { inlineIcon } from '../../../icons.js';

export const navToggle = defineComponent('navToggle', {
  summary: 'The accessible menu button used by a responsive header.',
  docs: 'src/components/atoms/navToggle/README.md',
  runtime: ['nav'],
  options: {
    controls: { type: 'id', required: true, summary: 'The id of the navigation this button opens.' },
    label: { type: 'text', default: 'Toggle navigation', summary: 'Its accessible name.' },
  },
  render: ({ controls, label }) =>
    h(
      'button',
      {
        class: ['ds-icon-button', 'ds-nav-toggle'],
        type: 'button',
        'aria-expanded': 'false',
        'aria-controls': controls,
        'aria-label': label,
        'data-nav-toggle': true,
      },
      [
        h('span', { class: 'ds-nav-toggle__menu' }, inlineIcon('menu')),
        h('span', { class: 'ds-nav-toggle__close' }, inlineIcon('close')),
      ],
    ),
});
