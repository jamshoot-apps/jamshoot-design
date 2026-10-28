import { badge } from '../../atoms/badge/badge.js';
import { visuallyHidden } from '../../atoms/visuallyHidden/visuallyHidden.js';
import { defineComponent } from '../../../define.js';
import { h } from '../../../html.js';
import { inlineIcon } from '../../../icons.js';

export const plan = defineComponent('plan', {
  summary: 'One pricing tier. Two or three of them sit in a grid.',
  docs: 'src/components/molecules/plan/README.md',
  options: {
    title: { type: 'text', required: true, summary: 'What the tier is called.' },
    /*
     * One option, four fields: the nesting says once that they all describe the
     * price, as `link` does for its fields.
     */
    price: {
      type: 'shape',
      required: true,
      summary: 'The displayed price and its qualifiers.',
      of: {
        amount: { type: 'text', required: true, summary: 'The price as display text, including its currency.' },
        previous: { type: 'text', summary: 'The former price, smaller and struck through beside the current one.' },
        previousLabel: {
          type: 'text',
          default: 'Previous price',
          summary: 'Screen-reader label for the former price, because a strikethrough alone may not be announced.',
        },
        note: { type: 'markup', summary: 'A small qualifier directly below the price. May carry an inline link.' },
      },
    },
    subtitle: { type: 'text', summary: 'One line explaining what the tier is for.' },
    features: { type: 'lines', required: true, summary: 'What the tier includes, one line each.' },
    featured: { type: 'boolean', default: false, summary: 'Visually marks a recommended tier. Use at most one per comparison; build and lint do not check this across plans.' },
    badgeLabel: { type: 'text', summary: 'A word on the tier — "Popular", "Free". Drawn as a badge().' },
    link: {
      type: 'shape',
      summary: 'An optional text link at the bottom of the tier.',
      of: {
        label: { type: 'text', required: true, summary: 'What the link says.' },
        href: { type: 'url', required: true, summary: 'Where it goes.' },
      },
    },
  },
  /* A div, like a card: a tier is page furniture, not a syndicable composition. */
  render: ({ title, price, subtitle, features, featured, badgeLabel, link }) =>
    h('div', { class: ['ds-plan', featured && 'ds-plan--featured'] }, [
      h('header', { class: 'ds-plan__head' }, [
        h('h3', { class: 'ds-plan__name', text: title }),
        badgeLabel &&
          h('div', { class: 'ds-plan__badge' }, badge({ label: badgeLabel, tone: featured ? 'accent' : 'plain' })),
      ]),
      h('div', { class: 'ds-plan__cost' }, [
        h('div', { class: 'ds-plan__price-group' }, [
          h('div', { class: 'ds-plan__price-row' }, [
            h('p', { class: 'ds-plan__price', text: price.amount }),
            price.previous && h('s', { class: 'ds-plan__previous-price' }, [
              visuallyHidden({ text: `${price.previousLabel}: ` }),
              price.previous,
            ]),
          ]),
          price.note && h('p', { class: 'ds-plan__price-note', html: price.note }),
        ]),
        subtitle && h('p', { class: 'ds-plan__subtitle', text: subtitle }),
      ]),
      h(
        'ul',
        { class: 'ds-plan__features' },
        features.map((feature) => h('li', {}, [
          h('span', { class: 'ds-plan__feature-icon' }, inlineIcon('checkmark')),
          h('span', { text: feature }),
        ])),
      ),
      link &&
        h('a', { class: 'ds-plan__action', href: link.href }, [
          link.label,
          h('span', { class: 'ds-plan__action-icon' }, inlineIcon('arrow-forward')),
        ]),
    ]),
});
