import { defineComponent } from '../../../define.js';
import { h } from '../../../html.js';
import { container } from '../../layout/container/container.js';

export const footer = defineComponent('footer', {
  summary: 'The page footer: optional introduction, contact, link columns and legal copy.',
  docs: 'src/components/organisms/footer/README.md',
  options: {
    blurb: { type: 'text', summary: 'An optional product description beside the link columns.' },
    email: { type: 'text', summary: 'The contact email, linked with mailto.' },
    showContact: { type: 'boolean', default: true, summary: 'Show the contact email when one is supplied.' },
    groups: {
      type: 'items', required: true, summary: 'The link columns, left to right.',
      of: {
        title: { type: 'text', required: true, summary: 'What the column groups.' },
        links: {
          type: 'items', required: true, summary: 'The links in the column.',
          of: {
            label: { type: 'text', required: true, summary: 'What the link says.' },
            href: { type: 'url', required: true, summary: 'Where it goes.' },
          },
        },
      },
    },
    copyright: { type: 'text', required: true, summary: 'The copyright notice, with the year already resolved.' },
    legalNote: { type: 'text', summary: 'Trademark attributions above the copyright line.' },
  },
  render: ({ blurb, email: contact, showContact, groups, copyright, legalNote }) => {
    const email = showContact && contact;
    const hasIntro = Boolean(blurb || email);
    return h('footer', { class: 'ds-footer' }, container({ content: [
      h('div', { class: ['ds-footer__top', hasIntro && 'ds-footer__top--with-intro'] }, [
        hasIntro && h('div', {}, [
          blurb && h('p', { class: 'ds-footer__blurb', text: blurb }),
          email && h('p', { class: 'ds-footer__contact' }, h('a', { href: `mailto:${email}`, text: email })),
        ]),
        h('div', { class: 'ds-footer__columns' }, groups.map((column) =>
          h('div', { class: 'ds-footer__column' }, [
            h('p', { class: 'ds-footer__column-title', text: column.title }),
            h('ul', { class: 'ds-footer__column-links' }, column.links.map((link) =>
              h('li', {}, h('a', { href: link.href, text: link.label })),
            )),
          ]),
        )),
      ]),
      h('div', { class: 'ds-footer__legal' }, [legalNote && h('p', { text: legalNote }), h('p', { text: copyright })]),
    ] }));
  },
});
