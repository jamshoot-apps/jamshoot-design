import { defineComponent } from '../../../define.js';
import { h } from '../../../html.js';

export const note = defineComponent('note', {
  summary: 'The quiet line under a section: a caveat, a footnote, the sentence that keeps a claim honest.',
  docs: 'src/components/atoms/note/README.md',
  options: {
    body: { type: 'markup', required: true, summary: 'One sentence. May carry an inline link.' },
  },
  render: ({ body }) => h('p', { class: 'ds-note', html: body }),
});
