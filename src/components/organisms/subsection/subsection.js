import { defineComponent } from '../../../define.js';
import { demoteHeadings, h } from '../../../html.js';

export const subsection = defineComponent('subsection', {
  summary: 'A titled block inside a section — an FAQ split into subjects, a spec sheet split into groups.',
  docs: 'src/components/organisms/subsection/README.md',
  options: {
    title: { type: 'text', required: true, summary: 'What this group is.' },
    content: {
      type: 'content',
      required: true,
      summary: 'The group itself: cards, steps, an faq(), a table(). Whatever titles itself drops a level.',
    },
    id: { type: 'id', summary: 'An anchor, so the group can be linked to directly.' },
  },
  /*
   * Content may carry its own h3: the commonest shape a landing page has is a section
   * of features, grouped, each group a row of cards. The group's heading is the reason
   * its content moves down a level, so the wrapper does that itself rather than making
   * it the caller's problem to avoid.
   */
  render: ({ title, content, id }) =>
    h('div', { class: 'ds-subsection', id }, [
      h('h3', { class: 'ds-subsection__title', text: title }),
      demoteHeadings(content),
    ]),
});
