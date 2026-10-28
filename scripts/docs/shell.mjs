import { container, brand, themeToggle, navToggle } from '../../src/index.js';
import { h, escape } from '../../src/html.js';
import { themeBoot } from '../../src/theme.js';
import { themeChoices } from '../../src/themes.js';

export function navigation(pages, currentSlug) {
  let group = null;
  return pages.map((entry) => {
    const heading = entry.group === group ? '' : `<strong${entry.group === 'Layout' ? ' class="docs__reference-start"' : ''}>${entry.group}</strong>`;
    group = entry.group;
    const current = entry.slug === currentSlug ? ' aria-current="page"' : '';
    return `${heading}<a href="${entry.slug}.html"${current}>${escape(entry.navTitle ?? entry.title)}</a>`;
  }).join('');
}

export function shell({ title, nav, body, cssHref, jsHref, themes }) {
  return `<!doctype html>\n${h('html', { lang: 'en' }, [
    h('head', {}, [
      h('meta', { charset: 'utf-8' }),
      h('meta', { name: 'viewport', content: 'width=device-width, initial-scale=1' }),
      h('title', { text: title === 'JamShoot Design' ? title : `${title} — JamShoot Design` }),
      themeBoot(),
      h('link', { rel: 'stylesheet', href: cssHref }),
      h('script', { src: jsHref, defer: true }),
    ]),
    h('body', {}, [
      h('header', { class: ['ds-header', 'docs-header'] }, [
        container({
          content: h('div', { class: 'ds-header__bar' }, [
            brand({ logo: 'brand/jamshoot/logo.svg', text: 'JamShoot Design', href: 'index.html', compact: true }),
            h('div', { class: 'ds-header__end' }, [
              themeToggle({ label: 'Theme', choices: themeChoices(themes, { auto: 'Auto' }) }),
              h('span', { class: 'docs-header__toggle' },
                navToggle({ controls: 'ds-docs-nav', label: 'Toggle documentation navigation' })),
            ]),
          ]),
        }),
      ]),
      h('main', { class: 'ds-container docs-main' }, [
        h('div', { class: 'docs' }, [
          h('nav', { class: 'docs__nav', id: 'ds-docs-nav', 'aria-label': 'Documentation', html: nav }),
          h('article', { class: 'docs__body', html: body }),
        ]),
      ]),
    ]),
  ])}\n`;
}
