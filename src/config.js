/**
 * What `site.config.js` is allowed to say.
 *
 * Every component on a page is checked, and the one file every page reads was not:
 * `header()` and `footer()` took the config object on trust and indexed straight into
 * it, so a renamed key was a `TypeError` from inside the library — or, worse, a footer
 * column that quietly went missing.
 *
 * It is the same declaration the components use, so it fails the same way: the path to
 * the offending key, the valid set, and a suggestion when the name is close.
 */

import { posix } from 'node:path';
import { constraint, defineShape } from './define.js';
import { header } from './components/organisms/header/header.js';
import { footer } from './components/organisms/footer/footer.js';

const link = {
  label: { type: 'text', required: true, summary: 'What the link says.' },
  href: { type: 'url', required: true, summary: 'Where it goes.' },
};

/*
 * A typeface the site ships itself. The file is the site's, so it sits in the site's
 * assets/ and the build only writes the @font-face for it — the family name, the files
 * and the fallback are the three things that cannot be inferred.
 */
const FONT_WEIGHTS = [400, 500, 600, 700];

const face = (role) => ({
  type: 'shape',
  summary: role,
  of: {
    family: { type: 'text', required: true, summary: 'The family name, as the @font-face will declare it.' },
    fallback: {
      type: 'text',
      required: true,
      summary: 'The platform stack it falls back to while it loads — `Georgia, serif`.',
    },
    files: {
      type: 'items',
      required: true,
      summary: 'One woff2 per weight the site uses, in assets/.',
      of: {
        weight: { type: 'number', required: true, summary: `A weight on the scale: ${FONT_WEIGHTS.join(', ')}.` },
        path: { type: 'url', required: true, summary: 'A normalized local .woff2 path under assets/, relative to the site root.' },
      },
    },
  },
});

export const FONT_ROLES = ['display', 'sans', 'mono'];

export const siteConfig = defineShape('site.config.js', {
  summary: 'Brand, navigation, footer and contact — everything that is the same on every page.',
  docs: 'docs/configuration.md',
  options: {
    lang: { type: 'text', default: 'en', summary: 'The document language. `en` unless the site is not in English.' },
    url: {
      type: 'url',
      summary: 'The site’s own origin. Empty until it has a domain — canonical and og:url are left out until then.',
    },

    brand: {
      type: 'shape',
      required: true,
      summary: 'The name and the marks that carry it.',
      of: {
        name: { type: 'text', required: true, summary: 'The product name, spelled the way the app spells it.' },
        tagline: { type: 'text', summary: 'One line on what it does. Used where a name alone is not enough.' },
        logo: { type: 'url', summary: 'The lockup image, shown in the header.' },
        favicon: { type: 'url', summary: 'The browser-tab icon.' },
        appleTouchIcon: { type: 'url', summary: 'The home-screen icon.' },
      },
    },

    appStore: {
      type: 'shape',
      summary: 'The one call to action on the site.',
      of: {
        label: { type: 'text', required: true, summary: 'What every download button says.' },
        href: {
          type: 'url',
          summary: 'The listing. Null until it is live, which leaves every download button out of the page.',
        },
      },
    },

    contact: {
      type: 'shape',
      summary: 'The channels the site publishes. Nothing here promises a response time.',
      of: {
        email: { type: 'text', summary: 'The one address, shown in the footer and on the support page.' },
        developer: { type: 'text', summary: 'Who ships it, for the legal pages.' },
      },
    },

    nav: {
      type: 'shape',
      required: true,
      summary: 'The header navigation.',
      of: {
        links: header.spec.options.links,
        label: header.spec.options.label,
        toggleLabel: header.spec.options.toggleLabel,
        hideOnScroll: header.spec.options.hideOnScroll,
        homeHref: { type: 'url', default: 'index.html', summary: 'Where the brand lockup links.' },
      },
    },

    footer: {
      type: 'shape',
      required: true,
      summary: 'The footer, on every page.',
      of: {
        blurb: footer.spec.options.blurb,
        showContact: footer.spec.options.showContact,
        columns: footer.spec.options.groups,
        copyright: {
          type: 'template', required: true,
          summary: 'The notice. Write it as (year) => … so the build resolves the current year.',
        },
        legalNote: footer.spec.options.legalNote,
      },
    },

    ogImage: {
      type: 'shape',
      summary: 'The share image. Its size is declared because a card renderer reads it before the file.',
      of: {
        path: { type: 'url', required: true, summary: 'Path to the image.' },
        width: { type: 'number', required: true, summary: 'Intrinsic width in pixels.' },
        height: { type: 'number', required: true, summary: 'Intrinsic height in pixels.' },
      },
    },

    jsonLd: {
      type: 'json',
      summary: 'Structured data on every page — typically an Organization or WebSite node. A page can add its own on top with `pages.js`’s `jsonLd`.',
    },

    skipLink: {
      type: 'text',
      default: 'Skip to main content',
      summary: 'The first thing a keyboard reaches on every page.',
    },

    /*
     * What a palette is called is in the palette, not here: `--ds-theme-label` in the
     * file. So this stays two strings however many themes a site grows — the name of
     * the control, and the name of the one state that is not a palette.
     */
    theme: {
      type: 'shape',
      summary:
        'The reader’s side of the palette. Leave it out and every reader gets the site’s own colours; set it when the site declares more than one palette and the reader should be able to choose.',
      of: {
        toggle: {
          type: 'boolean',
          default: false,
          summary: 'Put the theme control in the header. Needs a second palette in `themes/`.',
        },
        label: { type: 'text', default: 'Theme', summary: 'What the control is called, read before the state it is in.' },
        auto: { type: 'text', default: 'Auto', summary: 'What the state that follows the operating system is called.' },
        action: {
          type: 'text',
          default: 'Switch to',
          summary: 'What one click does, read with the next palette’s name after it.',
        },
      },
    },

    /*
     * Type is a brand decision the way colour is, so a site may make it — but only by
     * naming a face for a role the scale already has. Sizes, weights and leading stay
     * the library's: a site changes what the letters look like, not how big they are.
     */
    fonts: {
      type: 'shape',
      summary:
        'The site’s own typefaces. Leave it out for system fonts; set a role to replace its face while keeping the library scale.',
      of: {
        display: face('Headings, h1 to h4. Falls back to `sans` when left out.'),
        sans: face('Everything else: body copy, controls, labels.'),
        mono: face('Code and anything set as data.'),
      },
    },

    runtime: {
      type: 'lines',
      default: ['nav'],
      summary: 'Library runtime modules this site loads. `blocks/*.client.js` are added on their own.',
    },
  },
  constraints: [
    constraint('`runtime` to list `nav` whenever `nav.hideOnScroll` is on', ({ nav, runtime }) =>
      nav.hideOnScroll && !runtime.includes('nav')
        ? 'nav.hideOnScroll is on, but runtime does not list "nav" — the header would never hide'
        : null,
    ),
    /*
     * The control is markup and the switching is a runtime module, and a site that
     * asks for one without the other gets a button that does nothing — the failure
     * nobody reports as a bug, because the page looks right until it is clicked.
     */
    constraint('`runtime` to list `theme` whenever `theme.toggle` is on', ({ theme, runtime }) =>
      theme?.toggle && !runtime.includes('theme')
        ? 'theme.toggle is on, but runtime does not list "theme" — the control would render and do nothing'
        : null,
    ),
    /*
     * A weight the scale has no token for is a weight no rule asks for: the file would
     * be downloaded and never drawn. A file that is not woff2 is three times the bytes.
     */
    constraint(`font files to be .woff2 at a weight on the scale (${FONT_WEIGHTS.join(', ')})`, ({ fonts }) => {
      for (const role of FONT_ROLES) {
        for (const file of fonts?.[role]?.files ?? []) {
          if (!FONT_WEIGHTS.includes(file.weight)) {
            return `fonts.${role}: weight ${file.weight} is not on the scale — use ${FONT_WEIGHTS.join(', ')}`;
          }

          if (!file.path.endsWith('.woff2')) {
            return `fonts.${role}: "${file.path}" is not a .woff2 file`;
          }
          if (!file.path.startsWith('assets/') || posix.normalize(file.path) !== file.path || /[\\?#%]/.test(file.path)) {
            return `fonts.${role}: "${file.path}" must be a normalized local path under assets/`;
          }
        }
      }

      return null;
    }),
  ],
});

const pageList = defineShape('pages.js', {
  summary: 'The pages a site builds.',
  docs: 'docs/authoring.md',
  options: {
    pages: {
      type: 'items',
      required: true,
      summary: 'Every output page, in build order.',
      of: {
        id: { type: 'id', required: true, summary: 'The page identity used by navigation.' },
        path: { type: 'pagePath', required: true, summary: 'Its relative HTML destination below dist/.' },
        meta: {
          type: 'shape',
          required: true,
          summary: 'The title and search/share description.',
          of: {
            title: { type: 'text', required: true, summary: 'The document title.' },
            description: { type: 'text', required: true, summary: 'The document description.' },
          },
        },
        render: { type: 'function', required: true, summary: 'Returns the sections inside main.' },
        jsonLd: { type: 'json', summary: 'Optional structured data for the page.' },
        /*
         * One fact, three consequences, so a site cannot get two of them and miss the
         * third. The host serves this page in place of any path that does not exist:
         * it has no URL of its own to be canonical or listed under, it should not be
         * indexed, and it is read at addresses its relative links were never written
         * for — `/a/b` would look for its stylesheet under `/a/`.
         */
        notFound: {
          type: 'boolean',
          default: false,
          summary:
            'The page the host serves for a missing path. Left out of sitemap.xml, marked noindex with no canonical URL, and its relative links resolved from the site root so it works at any depth.',
        },
      },
    },
  },
  constraints: [
    constraint('unique page ids and paths', ({ pages }) => {
      const ids = new Set();
      const paths = new Set();

      for (const page of pages) {
        if (ids.has(page.id)) return `page id "${page.id}" is declared more than once`;
        if (paths.has(page.path)) return `page path "${page.path}" is declared more than once`;
        ids.add(page.id);
        paths.add(page.path);
      }

      return null;
    }),
    constraint('at most one notFound page', ({ pages }) => {
      const fallbacks = pages.filter((page) => page.notFound).map((page) => page.id);

      return fallbacks.length > 1
        ? `pages ${fallbacks.join(', ')} are all marked notFound — the host can serve only one of them`
        : null;
    }),
  ],
});

const renderedPage = defineShape('pages.js render()', {
  summary: 'The component list a page renderer returns.',
  docs: 'docs/authoring.md',
  options: {
    sections: { type: 'sections', required: true, summary: 'What goes inside main.' },
  },
});

export const sitePages = (pages) => pageList({ pages }).pages;
export const pageSections = (sections) => renderedPage({ sections }).sections;
