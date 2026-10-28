import { defineComponent } from '../../../define.js';
import { h } from '../../../html.js';
import { navToggle } from '../../atoms/navToggle/navToggle.js';
import { container } from '../../layout/container/container.js';

export const header = defineComponent('header', {
  summary: 'The page navigation and brand, pinned or hidden on downward scroll.',
  docs: 'src/components/organisms/header/README.md',
  runtime: ['nav'],
  options: {
    brand: { type: 'content', required: true, summary: 'The brand lockup, usually brand({ compact: true }).' },
    links: {
      type: 'items', required: true, summary: 'The navigation links, in reading order.',
      of: {
        label: { type: 'text', required: true, summary: 'What the link says.' },
        href: { type: 'url', required: true, summary: 'Where the link goes.' },
        id: { type: 'id', summary: 'Matches activeId to mark the current page.' },
      },
    },
    activeId: { type: 'id', summary: 'The current page id.' },
    label: { type: 'text', default: 'Primary', summary: 'The accessible name of the navigation.' },
    toggleLabel: { type: 'text', default: 'Toggle navigation', summary: 'The accessible name of the mobile menu button.' },
    hideOnScroll: { type: 'boolean', default: false, summary: 'Hide on downward scroll and reveal on upward scroll. Requires the nav runtime.' },
    theme: { type: 'content', summary: 'An optional themeToggle() beside the navigation.' },
  },
  render: ({ brand, links, activeId, label, toggleLabel, hideOnScroll, theme }) =>
    h('header', { class: 'ds-header', 'data-hide-on-scroll': hideOnScroll },
      container({
        content: h('div', { class: 'ds-header__bar' }, [
          brand,
          h('div', { class: 'ds-header__end' }, [
            h('nav', { class: 'ds-header__nav', id: 'ds-nav', 'aria-label': label }, links.map((link) =>
              h('a', { class: 'ds-header__link', href: link.href, text: link.label, 'aria-current': activeId && link.id === activeId ? 'page' : null }),
            )),
            theme,
            h('span', { class: 'ds-header__toggle' }, navToggle({ controls: 'ds-nav', label: toggleLabel })),
          ]),
        ]),
      }),
    ),
});
