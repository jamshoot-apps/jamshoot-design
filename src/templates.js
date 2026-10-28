import { header } from './components/organisms/header/header.js';
import { footer } from './components/organisms/footer/footer.js';
import { brand } from './components/atoms/brand/brand.js';
import { themeToggle } from './components/atoms/themeToggle/themeToggle.js';
import { themeChoices } from './themes.js';
import { fragment, h, raw } from './html.js';
import { themeBoot } from './theme.js';
import { rewriteUrlAttributes } from './html-transform.js';

// Shared configuration is authored from the site root; page sections remain page-relative.
function sharedUrl(value, pagePath) {
  return value && !/^(?:[#/?]|[a-z][a-z0-9+.-]*:)/i.test(value)
    ? '../'.repeat(pagePath.split('/').length - 1) + value
    : value;
}

function absolute(siteUrl, path) {
  if (!siteUrl || path == null) {
    return null;
  }

  return new URL(path, siteUrl).href;
}

/**
 * The public URL path of a page file. A page whose file is `index.html` is served at
 * its directory, so `index.html` is `` and `docs/index.html` is `docs/`. Every other
 * path is its own address. Canonical, og:url and sitemap.xml all use this one mapping.
 */
export function publicPath(path) {
  return path.replace(/(^|\/)index\.html$/, '$1');
}

// A script element ends at </script>, even when that sequence is inside JSON text.
const scriptJson = (value) => JSON.stringify(value).replaceAll('<', '\\u003c');

function head({ site, page, cssHref, jsHref }) {
  const { meta } = page;
  // The not-found page is served at whatever address was missing; it has no URL of its own.
  const canonical = page.notFound ? null : absolute(site.url, publicPath(page.path));
  const ogImage = absolute(site.url, site.ogImage?.path);

  return h('head', {}, [
    h('meta', { charset: 'utf-8' }),
    h('meta', { name: 'viewport', content: 'width=device-width, initial-scale=1' }),
    h('title', { text: meta.title }),
    h('meta', { name: 'description', content: meta.description }),
    page.notFound && h('meta', { name: 'robots', content: 'noindex' }),
    canonical && h('link', { rel: 'canonical', href: canonical }),

    h('meta', { property: 'og:type', content: 'website' }),
    h('meta', { property: 'og:site_name', content: site.brand.name }),
    h('meta', { property: 'og:title', content: meta.title }),
    h('meta', { property: 'og:description', content: meta.description }),
    canonical && h('meta', { property: 'og:url', content: canonical }),
    ogImage && h('meta', { property: 'og:image', content: ogImage }),
    ogImage && h('meta', { property: 'og:image:width', content: site.ogImage.width }),
    ogImage && h('meta', { property: 'og:image:height', content: site.ogImage.height }),
    h('meta', { name: 'twitter:card', content: ogImage ? 'summary_large_image' : 'summary' }),

    site.brand.favicon && h('link', { rel: 'icon', href: sharedUrl(site.brand.favicon, page.path) }),
    site.brand.appleTouchIcon && h('link', { rel: 'apple-touch-icon', href: sharedUrl(site.brand.appleTouchIcon, page.path) }),

    /*
     * Ahead of the stylesheet, so a stored choice is on <html> before the first paint
     * and never flashes past. Below the link it would still beat the paint, but an
     * inline script after a stylesheet waits for that stylesheet to load first — three
     * statements with nothing to fetch should not be queued behind a download.
     */
    site.theme?.toggle && themeBoot(),
    h('link', { rel: 'stylesheet', href: cssHref }),
    jsHref && h('script', { src: jsHref, defer: true }),
    site.jsonLd && h('script', { type: 'application/ld+json', html: scriptJson(site.jsonLd) }),
    page.jsonLd && h('script', { type: 'application/ld+json', html: scriptJson(page.jsonLd) }),
  ]);
}

export function page({ site, page: pageConfig, sections, cssHref, jsHref, themes = [] }) {
  const shared = (markup) => raw(rewriteUrlAttributes(String(markup), (value) => sharedUrl(value, pageConfig.path)));
  return raw(
    `<!doctype html>\n${h('html', { lang: site.lang ?? 'en' }, [
      head({ site, page: pageConfig, cssHref, jsHref }),
      h('body', { 'data-page': pageConfig.id }, [
        h('a', { class: 'ds-skip-link', href: '#main', text: site.skipLink ?? 'Skip to main content' }),
        shared(header({
          brand: brand({ logo: site.brand.logo, text: site.brand.name, tagline: site.brand.tagline, href: site.nav.homeHref, compact: true }),
          links: site.nav.links,
          activeId: pageConfig.id,
          label: site.nav.label,
          toggleLabel: site.nav.toggleLabel,
          hideOnScroll: site.nav.hideOnScroll,
          theme: site.theme?.toggle && themeToggle({ label: site.theme.label, action: site.theme.action, choices: themeChoices(themes, { auto: site.theme.auto }) }),
        })),
        h('main', { id: 'main' }, fragment(sections)),
        shared(footer({
          blurb: site.footer.blurb,
          showContact: site.footer.showContact,
          groups: site.footer.columns,
          legalNote: site.footer.legalNote,
          email: site.contact?.email,
          copyright: typeof site.footer.copyright === 'function' ? site.footer.copyright(new Date().getFullYear()) : site.footer.copyright,
        })),
      ]),
    ])}\n`,
  );
}
