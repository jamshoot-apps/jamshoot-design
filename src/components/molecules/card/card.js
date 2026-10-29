import { atMostOne, defineComponent } from '../../../define.js';
import { h } from '../../../html.js';
import { iconTile } from '../../atoms/iconTile/iconTile.js';

export const card = defineComponent('card', {
  summary: 'A bordered panel for a title, supporting text or bullets, and optional icon or media.',
  docs: 'src/components/molecules/card/README.md',
  options: {
    title: { type: 'text', required: true, summary: 'The claim, as a short sentence.' },
    body: { type: 'markup', summary: 'One or two sentences supporting it. Use this or `bullets`, not both.' },
    bullets: { type: 'lines', summary: 'A bullet list instead of a paragraph — formats, requirements, what is included.' },
    icon: { type: 'icon', summary: 'An icon name, shown on a tile above the title.' },
    media: { type: 'content', summary: 'Renderable content in the card-owned edge-to-edge media slot.' },
  },
  constraints: [atMostOne(['body', 'bullets'], 'a card says one thing')],
  render: ({ title, body, bullets, icon: iconName, media }) =>
    /*
     * A div: a card is page furniture, not a composition anybody would syndicate on
     * its own, and whether a run of them is a list belongs to whatever arranges them.
     *
     * The tile is `iconTile()`, the atom that exists for it: calling an atom is what a
     * molecule is for, and the tile's declarations live in one place.
     */
    h('div', { class: 'ds-card' }, [
      media && h('div', { class: 'ds-card__media' }, media),
      iconName && iconTile({ icon: iconName }),
      h('div', { class: 'ds-card__copy' }, [
        h('h3', { class: 'ds-card__title', text: title }),
        body && h('p', { class: 'ds-card__body', html: body }),
        bullets && h('ul', { class: 'ds-card__body ds-card__list' }, bullets.map((line) => h('li', { text: line }))),
      ]),
    ]),
});
