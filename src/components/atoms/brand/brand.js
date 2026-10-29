import { atLeastOne, defineComponent, requiredWith } from '../../../define.js';
import { h } from '../../../html.js';

/** The square attributes establish the logo's aspect ratio before the image loads. */
const LOGO_INTRINSIC_PX = 64;

export const brand = defineComponent('brand', {
  summary: 'A logo with optional name and tagline beside or below it.',
  docs: 'src/components/atoms/brand/README.md',
  options: {
    logo: { type: 'url', summary: 'Path to the logo file.' },
    text: { type: 'text', summary: 'The name, shown beside the logo.' },
    tagline: { type: 'text', summary: 'A short subtitle shown below the name.' },
    label: { type: 'text', summary: 'The name for screen readers only, when the logo stands alone.' },
    position: {
      type: 'enum',
      values: ['end', 'bottom'],
      default: 'end',
      summary: 'Where the text sits relative to the logo.',
    },
    compact: {
      type: 'boolean',
      default: false,
      summary: 'A compact lockup for control rows. Uses a smaller logo and hides the tagline below 52 rem.',
    },
    href: { type: 'url', summary: 'Where it links. Omit for a lockup that is not a link.' },
  },
  constraints: [
    atLeastOne(['text', 'label'], 'a logo with no name is unreadable aloud'),
    requiredWith('logo', 'label', '`label` names the logo, so with no logo it is read by nobody — use `text`'),
  ],
  render: ({ logo, text, tagline, label, position, compact, href }) => {
    const name = text ?? label;

    return h(
      href ? 'a' : 'span',
      {
        class: ['ds-brand', position === 'bottom' && 'ds-brand--bottom', compact && 'ds-brand--compact'],
        href,
      },
      [
        logo &&
          h('img', {
            class: 'ds-brand__logo',
            src: logo,
            alt: text ? '' : name,
            width: LOGO_INTRINSIC_PX,
            height: LOGO_INTRINSIC_PX,
          }),
        tagline
          ? h('span', { class: 'ds-brand__copy' }, [
              text && h('span', { class: 'ds-brand__text', text }),
              h('span', { class: 'ds-brand__tagline', text: tagline }),
            ])
          : text && h('span', { class: 'ds-brand__text', text }),
      ],
    );
  },
});
