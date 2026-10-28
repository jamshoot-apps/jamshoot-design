import { eyebrow } from '../../atoms/eyebrow/eyebrow.js';
import { defineComponent } from '../../../define.js';
import { cluster } from '../../layout/cluster/cluster.js';
import { container } from '../../layout/container/container.js';
import { h } from '../../../html.js';

export const hero = defineComponent('hero', {
  summary: 'The top of a landing page: what the product is, on one side, and what it looks like on the other.',
  docs: 'src/components/organisms/hero/README.md',
  options: {
    title: { type: 'text', required: true, summary: 'What the product does, as a sentence a customer would say.' },
    lead: { type: 'markup', required: true, summary: 'Supporting text under the title. Usually two or three sentences; inline links are allowed.' },
    eyebrow: { type: 'text', summary: 'A short audience or category label above the title.' },
    actions: { type: 'content', summary: 'Action content, usually one or two button() calls. Use the primary variant for the main action.' },
    proof: { type: 'content', summary: 'A proof() of checkable claims.' },
    visual: {
      type: 'content',
      summary: 'A figure() or site block. Hero controls placement; the supplied visual owns its internal layout.',
    },
  },
  render: ({ title, lead, eyebrow: label, actions, proof, visual }) =>
    h('section', { class: 'ds-hero' }, [
      container({
        content: h('div', { class: 'ds-hero__inner' }, [
          h('div', { class: 'ds-hero__copy' }, [
            h('hgroup', {}, [label && eyebrow({ text: label }), h('h1', { class: 'ds-hero__title', text: title })]),
            h('p', { class: 'ds-hero__lead', html: lead }),
            actions && h('div', { class: 'ds-hero__actions' }, cluster({ content: actions })),
            proof && h('div', { class: 'ds-hero__proof' }, proof),
          ]),
          visual && h('div', { class: 'ds-hero__visual' }, visual),
        ]),
      }),
    ]),
});
