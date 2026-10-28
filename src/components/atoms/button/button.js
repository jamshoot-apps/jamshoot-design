import { defineComponent } from '../../../define.js';
import { h } from '../../../html.js';
import { inlineIcon } from '../../../icons.js';

export const button = defineComponent('button', {
  summary: 'A navigation link styled as a primary or ghost action. Omitted when href is missing.',
  docs: 'src/components/atoms/button/README.md',
  options: {
    label: { type: 'text', required: true, summary: 'What the button says.' },
    href: {
      type: 'url',
      summary:
        'Where it goes. Omit it and the button renders nothing, so a missing destination never shows as a dead link.',
    },
    variant: { type: 'enum', values: ['primary', 'ghost'], default: 'primary', summary: 'Which of the two it is.' },
    icon: { type: 'icon', summary: 'An icon name, shown after the label.' },
  },
  render: ({ label, href, variant, icon: iconName }) =>
    href && h('a', { class: ['ds-button', `ds-button--${variant}`], href }, [
      label,
      iconName && h('span', { class: 'ds-button__icon' }, inlineIcon(iconName)),
    ]),
});
