import { defineComponent } from '../../../define.js';
import { h } from '../../../html.js';
import { inlineIcon } from '../../../icons.js';

export const faq = defineComponent('faq', {
  summary: 'Questions that open without JavaScript. With the `faq` runtime, a deep link opens the answer it points at.',
  docs: 'src/components/molecules/faq/README.md',
  runtime: ['faq'],
  options: {
    items: {
      type: 'items',
      required: true,
      summary: 'The questions, in the order someone would ask them.',
      of: {
        question: { type: 'text', required: true, summary: 'Asked the way a reader would ask it.' },
        answer: { type: 'markup', required: true, summary: 'Answered in one or two sentences. May carry an inline link.' },
        id: { type: 'id', summary: 'An anchor, so the answer can be linked to directly.' },
      },
    },
  },
  render: ({ items }) =>
    h(
      'div',
      { class: 'ds-faq' },
      items.map((item) =>
        h('details', { class: 'ds-faq__item', id: item.id }, [
          /*
           * The question is a heading, so an FAQ is navigable by heading like every
           * other titled thing on the page — `summary` takes heading content for
           * exactly this. It is an h3 because an faq() sits inside a section's h2;
           * inside a subsection() it is demoted with the rest of the group.
           */
          h('summary', { class: 'ds-faq__question' }, [
            h('h3', { class: 'ds-faq__title', text: item.question }),
            h('span', { class: 'ds-faq__icon' }, inlineIcon('chevron-down')),
          ]),
          h('p', { class: 'ds-faq__answer', html: item.answer }),
        ]),
      ),
    ),
});
