import { defineComponent } from '../../../define.js';
import { inlineIcon } from '../../../icons.js';

export const icon = defineComponent('icon', {
  summary: 'An inline SVG that is the size and colour of the text around it.',
  docs: 'src/components/atoms/icon/README.md',
  styles: false,
  options: {
    name: { type: 'icon', required: true, summary: 'A built-in icon name or an SVG filename without .svg in JAMSHOOT_ICONS_DIR.' },
    label: {
      type: 'text',
      summary: 'Say what the icon means when it is the only thing carrying that meaning. Otherwise leave it out and it is hidden from screen readers.',
    },
  },
  render: ({ name, label }) => inlineIcon(name, { label }),
});
