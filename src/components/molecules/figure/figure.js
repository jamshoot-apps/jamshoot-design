import { defineComponent, requiredWith, together } from '../../../define.js';
import { h } from '../../../html.js';

export const figure = defineComponent('figure', {
  summary: 'A framed product image with an optional caption. Omit `src` for a labelled placeholder.',
  docs: 'src/components/molecules/figure/README.md',
  options: {
    src: { type: 'url', summary: 'The image. Omit it and the frame stays empty and labelled.' },
    srcset: { type: 'text', summary: 'Image candidates with width (`w`) descriptors. Supply `sizes` with them.' },
    sizes: { type: 'text', summary: 'The rendered width used for candidate selection. Required with `srcset`.' },
    alt: {
      type: 'text',
      summary:
        'The image’s purpose or relevant information. Required with `src`; use `""` for a decorative image.',
    },
    width: { type: 'number', summary: 'Intrinsic width in pixels. Supply with `height` to provide the aspect ratio.' },
    height: { type: 'number', summary: 'Intrinsic height in pixels. Supply with `width`.' },
    caption: { type: 'text', summary: 'A line under the frame.' },
    label: {
      type: 'text',
      default: 'Screenshot pending',
      summary: 'What the empty frame says while the screenshot does not exist.',
    },
    priority: {
      type: 'boolean',
      default: false,
      summary:
        'Use for a critical hero image. Sets `loading="eager"` and `fetchpriority="high"`; otherwise the image loads lazily.',
    },
  },
  /*
   * Require explicit alternative text, a source size for width-based candidates,
   * and paired intrinsic dimensions. These are library input rules; the browser
   * still chooses the resource and determines the final loading performance.
   */
  constraints: [
    requiredWith('alt', 'src', 'provide a text alternative, or an explicit empty string for a decorative image'),
    requiredWith('sizes', 'srcset', 'declare the rendered width for width-based image candidates'),
    together(['width', 'height'], 'provide the intrinsic aspect ratio with both dimensions'),
  ],
  render: ({ src, srcset, sizes, alt, width, height, caption, label, priority }) =>
    h('figure', { class: 'ds-figure' }, [
      h(
        'div',
        { class: 'ds-figure__frame' },
        src
          ? h('img', {
              src,
              srcset,
              sizes,
              alt,
              width,
              height,
              loading: priority ? 'eager' : 'lazy',
              fetchpriority: priority ? 'high' : null,
              decoding: 'async',
            })
          /* The fallback is the option's declared default, not a string in here: it
           * is words a reader sees, so it belongs where docs/foundations/language.md
           * can list it. */
          : h('div', { class: 'ds-figure__empty', text: label }),
      ),
      caption && h('figcaption', { class: 'ds-figure__caption', text: caption }),
    ]),
});
