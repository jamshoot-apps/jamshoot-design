import { eyebrow } from '../../atoms/eyebrow/eyebrow.js';
import { defineComponent } from '../../../define.js';
import { cluster } from '../../layout/cluster/cluster.js';
import { container } from '../../layout/container/container.js';
import { h } from '../../../html.js';

export const cta = defineComponent('cta', {
  summary: 'An action band at the end of a page or between sections, with optional supporting text and a note.',
  docs: 'src/components/organisms/cta/README.md',
  options: {
    title: { type: 'text', required: true, summary: 'The action heading. Keep it short.' },
    lead: { type: 'markup', summary: 'Supporting text under the heading, usually one sentence. Inline links are allowed.' },
    /*
     * A cta that closes the page needs no label — it is the end, and the reader can
     * see that. One that sits mid-page does: it is a band among bands, and the
     * eyebrow is what says which one, the same way it does on hero and section.
     */
    eyebrow: { type: 'text', summary: 'A short audience or section label, useful for a band between sections.' },
    actions: { type: 'content', summary: 'Usually the same button() as the hero.' },
    note: { type: 'markup', summary: 'A quiet line under the button — a contact address, a caveat.' },
  },
  render: ({ title, lead, eyebrow: label, actions, note }) =>
    h('section', { class: 'ds-cta' }, [
      container({
        content: h('div', { class: 'ds-cta__inner' }, [
          h('hgroup', {}, [label && eyebrow({ text: label }), h('h2', { text: title })]),
          lead && h('p', { class: 'ds-cta__lead', html: lead }),
          actions && h('div', { class: 'ds-cta__actions' }, cluster({ content: actions })),
          note && h('p', { class: 'ds-cta__note', html: note }),
        ]),
      }),
    ]),
});
