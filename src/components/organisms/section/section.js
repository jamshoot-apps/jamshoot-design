import { eyebrow } from '../../atoms/eyebrow/eyebrow.js';
import { defineComponent } from '../../../define.js';
import { container } from '../../layout/container/container.js';
import { h } from '../../../html.js';

function sectionHead({ eyebrow: text, title, lead }) {
  return h('header', { class: 'ds-section__head' }, [
    (text || title) && h('hgroup', {}, [text && eyebrow({ text }), title && h('h2', { text: title })]),
    lead && h('p', { class: 'ds-section__lead', html: lead }),
  ]);
}

export const section = defineComponent('section', {
  summary: 'A page region with optional heading text, required content and optional actions.',
  docs: 'src/components/organisms/section/README.md',
  options: {
    content: { type: 'content', required: true, summary: 'What the section is about — a grid, steps, an faq.' },
    id: { type: 'id', summary: 'An anchor, so the nav and in-page links can reach this band.' },
    eyebrow: { type: 'text', summary: 'The small line above the title that says which part of the page this is.' },
    title: { type: 'text', summary: 'What this part of the page is for, as a sentence.' },
    lead: { type: 'markup', summary: 'Supporting text under the title, usually one or two sentences.' },
    surface: {
      type: 'enum',
      values: ['default', 'sunken'],
      default: 'default',
      summary: 'Which surface role the band sits on. Alternate `sunken` down a long page so it has structure without a decorative divider.',
    },
    actions: {
      type: 'content',
      summary: 'A button() under the content, set off from it. The way on from a section that answered something.',
    },
  },
  render: ({ content, id, eyebrow: above, title, lead, surface, actions }) =>
    h('section', { class: ['ds-section', surface === 'sunken' && 'ds-section--sunken'], id }, [
      container({
        content: [
          sectionHead({ eyebrow: above, title, lead }),
          content,
          actions && h('div', { class: 'ds-section__cta' }, actions),
        ],
      }),
    ]),
});
