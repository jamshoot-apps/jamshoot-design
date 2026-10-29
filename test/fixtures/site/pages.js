import { card, cta, grid, legalDocument, pageHeader, section } from '../../../src/index.js';

import { sampleBlock } from './blocks/sample.js';
import { home } from './content/home.js';
import { support } from './content/support.js';

export const pages = [
  {
    id: 'home',
    path: 'index.html',
    meta: {
      title: 'Fixture integration site',
      description: 'A sample site that verifies the current JamShoot Design source.',
    },
    render: () => [
      section({
        title: home.hero.title,
        lead: home.hero.lead,
        content: sampleBlock(),
      }),
      section({
        id: 'coverage',
        eyebrow: 'Integration',
        title: 'Representative components',
        surface: 'sunken',
        content: grid({ cell: 'md', content: home.cards.map((entry) => card(entry)) }),
      }),
      cta({ title: home.closing.title, lead: home.closing.lead }),
    ],
  },
  {
    id: 'support',
    path: 'support.html',
    meta: {
      title: 'Fixture support',
      description: 'A document page used by the jamshoot-design integration fixture.',
    },
    render: () => [
      pageHeader({ title: support.title, byline: support.byline }),
      legalDocument({ sections: support.sections }),
    ],
  },
];
