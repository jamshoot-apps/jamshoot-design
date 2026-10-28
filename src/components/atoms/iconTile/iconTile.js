import { defineComponent } from '../../../define.js';
import { h } from '../../../html.js';
import { inlineIcon } from '../../../icons.js';

export const iconTile = defineComponent('iconTile', {
  summary: 'An icon on a raised square, for feature cards and step markers.',
  docs: 'src/components/atoms/iconTile/README.md',
  options: {
    name: { type: 'icon', required: true, summary: 'A built-in icon name or an SVG filename without .svg in JAMSHOOT_ICONS_DIR.' },
  },
  render: ({ name }) => h('span', { class: 'ds-icon-tile' }, inlineIcon(name)),
});
