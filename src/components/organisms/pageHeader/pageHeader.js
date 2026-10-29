import { defineComponent } from '../../../define.js';
import { container } from '../../layout/container/container.js';
import { h } from '../../../html.js';

export const pageHeader = defineComponent('pageHeader', {
  summary: 'The title of a page that is not the landing page: a policy, a support page.',
  docs: 'src/components/organisms/pageHeader/README.md',
  options: {
    title: { type: 'text', required: true, summary: 'The page’s name.' },
    byline: { type: 'text', summary: 'Dates and version lines that belong to the document, not to the copy.' },
    width: { type: 'enum', values: ['default', 'narrow'], default: 'narrow', summary: 'Match the page content: default for sections, narrow for documents.' },
  },
  render: ({ title, byline, width }) =>
    h('div', { class: 'ds-page-header' }, [
      container({
        width,
        content: h('div', { class: 'ds-page-header__content' }, [
          h('h1', { text: title }),
          byline && h('p', { class: 'ds-page-header__byline', text: byline }),
        ]),
      }),
    ]),
});
