#!/usr/bin/env node
/**
 * Site build. Reads a site's config and page modules, renders every page to static
 * HTML, and emits one stylesheet and one script for the whole site.
 *
 * There is no per-page asset splitting on purpose: the whole stylesheet is a few
 * kilobytes, so splitting it would cost a class of "this page links a sheet it never
 * renders" bugs and save nothing.
 */

import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { BASE_THEME, THEME_DIRECTORY } from '../tokens/contract.js';
import { FONT_ROLES, pageSections, siteConfig, sitePages } from '../config.js';
import { siteThemes } from '../themes.js';
import { stylesheet } from './styles.mjs';
import { filesBelow } from './files.js';
import { isMain, knownSites, locate, takeSitesFlag } from './sites.js';
import { rewriteUrlAttributes } from '../html-transform.js';
import { page, publicPath } from '../templates.js';
import { outputDestination, replaceOutput } from './output.js';

const LIB = fileURLToPath(new URL('../../', import.meta.url));
const OUTPUT_OWNER = 'JamShoot Design build output v1\n';

export { LAYER_SOURCES, librarySheets } from './styles.mjs';

const hash = (contents) => createHash('sha256').update(contents).digest('hex').slice(0, 8);
const xmlEscape = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const commentSpace = (comment) => {
  const lineBreaks = comment.match(/\r\n|\r|\n/g);
  return lineBreaks ? lineBreaks.join('') : ' ';
};

function quotedEnd(source, start) {
  const quote = source[start++];
  while (start < source.length) {
    const char = source[start++];
    if (char === '\\') start += Number(start < source.length);
    else if (char === quote) break;
  }
  return start;
}

/** CSS analysis helper for lint; build output does not use this transformation. */
export function stripCssComments(source) {
  let clean = '';

  for (let i = 0; i < source.length;) {
    if (source[i] === '"' || source[i] === "'") {
      const end = quotedEnd(source, i);
      clean += source.slice(i, end);
      i = end;
    } else if (source.startsWith('/*', i)) {
      const end = source.indexOf('*/', i + 2);
      const next = end < 0 ? source.length : end + 2;
      clean += commentSpace(source.slice(i, next));
      i = next;
    } else {
      clean += source[i++];
    }
  }

  return clean;
}

const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/**
 * The site's own typefaces as CSS: one @font-face per file, and the role token pointed
 * at the family. The stylesheet lives in styles/, so a path relative to the site root
 * is one level up from it. A file the config names and the site does not have fails
 * here, because a missing font is not an error any browser reports.
 */
export function fontCss(fonts, root) {
  const quote = (value) => `"${value.replace(/["\\]/g, '')}"`;
  const faces = [];
  const tokens = [];

  for (const role of FONT_ROLES) {
    const face = fonts?.[role];

    if (!face) {
      continue;
    }

    for (const { weight, path } of face.files) {
      if (root && !existsSync(join(root, path))) {
        throw new Error(`site.config.js: fonts.${role} names "${path}", which is not in the site`);
      }

      faces.push(
        `@font-face {\n  font-family: ${quote(face.family)};\n  src: url(${quote(`../${path}`)}) format("woff2");\n` +
          `  font-weight: ${weight};\n  font-style: normal;\n  font-display: swap;\n}`,
      );
    }

    tokens.push(`  --ds-font-${role}: ${quote(face.family)}, ${face.fallback.replace(/[;{}]/g, '')};`);
  }

  return tokens.length ? `${faces.join('\n\n')}\n\n:root {\n${tokens.join('\n')}\n}` : '';
}

/**
 * Rewrites a page's relative `href`, `src` and `srcset` to paths from the site root.
 *
 * Every page links relatively, which keeps a build portable between a domain and a
 * subdirectory. The one page that cannot is the not-found page: the host serves it
 * at the address that was missing, so from `/a/b` its `styles/site.css` would be
 * fetched from `/a/styles/`. Resolving against where the file really sits fixes that
 * for the header, the content and every block at once. Fragments, root paths and
 * anything with a scheme already mean the same thing at every depth and are left alone.
 */
export function fromSiteRoot(html, { root = '/', path }) {
  const page = new URL(path, `http://site${root}`);

  const resolve = (value) => {
    if (!value || /^[#/?]/.test(value) || SCHEME.test(value)) {
      return value;
    }

    const url = new URL(value, page);
    return url.pathname + url.search + url.hash;
  };

  return rewriteUrlAttributes(html, resolve);
}

async function readIfPresent(path) {
  return existsSync(path) ? readFile(path, 'utf8') : null;
}

async function concat(paths) {
  const parts = [];

  for (const path of paths) {
    parts.push(await readFile(path, 'utf8'));
  }

  // A leading IIFE in the next file must not call the previous file's last expression.
  return parts.join('\n;\n');
}

async function buildStyles(root, themes, fonts, out) {
  const css = await stylesheet(themes, filesBelow(join(root, 'blocks'), '.css'));

  /*
   * Site-owned font faces join the theme layer; their paths are relative to styles/.
   */
  const output = css + (fonts ? `\n\n@layer ds.theme {\n${fonts}\n}` : '');

  const cssName = `site.${hash(output)}.css`;
  await writeFile(join(out, 'styles', cssName), output);
  return cssName;
}

async function buildScripts(root, runtime, out) {
  const blockScripts = filesBelow(join(root, 'blocks'), '.client.js');
  const scripts = [...runtime, ...blockScripts];

  let jsHref = null;

  if (scripts.length) {
    const js = await concat(scripts);
    const jsName = `site.${hash(js)}.js`;
    await writeFile(join(out, 'scripts', jsName), js);
    jsHref = `scripts/${jsName}`;
  }
  return jsHref;
}

async function writePages(resolvedSite, resolvedPages, themes, out, cssName, jsHref) {
  for (const pageConfig of resolvedPages) {
    const prefix = '../'.repeat(pageConfig.path.split('/').length - 1);
    const markup = page({
      site: resolvedSite,
      page: pageConfig,
      sections: pageConfig.sections,
      cssHref: `${prefix}styles/${cssName}`,
      jsHref: jsHref && `${prefix}${jsHref}`,
      themes,
    });

    const html = pageConfig.notFound
      ? fromSiteRoot(String(markup), {
          root: resolvedSite.url ? new URL(resolvedSite.url).pathname : '/',
          path: pageConfig.path,
        })
      : String(markup);

    const destination = join(out, pageConfig.path);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, html);
  }
}

async function writeDiscovery(root, resolvedSite, resolvedPages, out) {
  if (resolvedSite.url) {
    const urls = resolvedPages
      .filter(({ notFound }) => !notFound)
      .map(({ path }) => new URL(publicPath(path), resolvedSite.url).href);
    const sitemap =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      urls.map((url) => `  <url><loc>${xmlEscape(url)}</loc></url>`).join('\n') +
      '\n</urlset>\n';

    await writeFile(join(out, 'sitemap.xml'), sitemap);
  }

  const robots = await readIfPresent(join(root, 'robots.txt'));
  const sitemapUrl = resolvedSite.url && new URL('sitemap.xml', resolvedSite.url).href;

  if (robots !== null || sitemapUrl) {
    await writeFile(
      join(out, 'robots.txt'),
      robots ?? `User-agent: *\nAllow: /\nSitemap: ${sitemapUrl}\n`,
    );
  }

  for (const file of ['.htaccess', 'llms.txt']) {
    const contents = await readIfPresent(join(root, file));

    if (contents !== null) {
      await writeFile(join(out, file), contents);
    }
  }
}

/** Keep the bundled artwork's notice with the HTML that inlines it. */
export async function copyIconLicense(out) {
  await mkdir(join(out, 'licenses'), { recursive: true });
  await cp(join(LIB, 'src/assets/icons/LICENSE.txt'), join(out, 'licenses/ionicons.txt'));
}

async function copyAssets(root, out) {
  const referenced = referencedAssets(out);
  const unreferencedAssets = [];

  for (const source of filesBelow(join(root, 'assets'), '')) {
    const path = relative(root, source).split('\\').join('/');

    if (basename(path) === '.DS_Store') {
      continue;
    }

    await mkdir(dirname(join(out, path)), { recursive: true });
    await cp(source, join(out, path));

    if (!referenced.has(path) && !LICENCE_TEXT.test(basename(path))) {
      unreferencedAssets.push(path);
    }
  }
  return unreferencedAssets;
}

/** Calls targeting one output run in order; failures do not poison subsequent builds. */
export async function buildSite(options) {
  const { root, out = join(root, 'dist') } = options;
  const output = {
    root, owner: OUTPUT_OWNER,
    sources: ['assets', 'blocks', 'content', 'node_modules', '.git', THEME_DIRECTORY].map((name) => resolve(root, name)),
  };
  outputDestination(out, output);
  const prepared = prepareSite(options);
  return replaceOutput(out, output, (staging) => buildGeneration(out, prepared, staging));
}

function prepareSite({ root, site, pages }) {
  // Validate before creating a staging directory or touching the last good build.
  const resolvedSite = siteConfig(site);
  const resolvedPages = sitePages(pages).map((page) => ({
    ...page,
    sections: pageSections(page.render({ site: resolvedSite })),
  }));
  const themes = siteThemes(root);
  const runtime = resolvedSite.runtime.map((name) => join(LIB, 'src/runtime', `${name}.js`));

  if (!themes.length) {
    throw new Error(`${BASE_THEME.file} is missing — a site must declare its own colours`);
  }

  /*
   * A control with one palette in it is a button that cycles between a page and the
   * same page. The site asked for a choice, so say which half is missing rather than
   * rendering the half that works.
   */
  if (resolvedSite.theme?.toggle && themes.length < 2) {
    throw new Error(
      `site.config.js: theme.toggle is on, but the site has one palette — add ${THEME_DIRECTORY}/<name>.css`,
    );
  }

  for (const path of runtime) {
    if (!existsSync(path)) {
      throw new Error(`site.config.js: runtime module "${basename(path, '.js')}" does not exist`);
    }
  }

  const fonts = fontCss(resolvedSite.fonts, root);
  return { root, resolvedSite, resolvedPages, themes, runtime, fonts };
}

async function buildGeneration(out, { root, resolvedSite, resolvedPages, themes, runtime, fonts }, staging) {
  await mkdir(join(staging, 'styles'), { recursive: true });
  await mkdir(join(staging, 'scripts'), { recursive: true });
  const cssName = await buildStyles(root, themes, fonts, staging);
  const jsHref = await buildScripts(root, runtime, staging);
  await writePages(resolvedSite, resolvedPages, themes, staging, cssName, jsHref);
  await writeDiscovery(root, resolvedSite, resolvedPages, staging);
  const unreferencedAssets = await copyAssets(root, staging);
  await copyIconLicense(staging);
  return { out, cssName, jsHref, pages: resolvedPages.length, unreferencedAssets };
}

/** A licence by its file name: LICENSE.txt, LICENCE.md, OFL.txt, Font-OFL.txt. */
const LICENCE_TEXT = /^(licen[cs]e|.*ofl)(\.[a-z]+)?$/i;

/**
 * Every `assets/…` path named anywhere in the built text files. A path is read up to
 * the first character that cannot be in one written by hand — a quote, a bracket, a
 * space before a srcset width — and anything after `?` or `#` is not part of the file.
 */
export function referencedAssets(out) {
  const found = new Set();
  const texts = filesBelow(out, ['.html', '.css', '.js', '.txt', '.xml', '.json', '.webmanifest', '.htaccess']);

  for (const path of texts) {
    for (const [match] of readFileSync(path, 'utf8').matchAll(/assets\/[^\s"'()<>,\\?#]+/g)) {
      found.add(match);
    }
  }

  return found;
}

/**
 * `node src/cli/build.mjs <site>` — the same entry point the dev server uses. Takes a
 * site name or a path; a name is resolved the way `src/cli/dev.mjs` resolves one.
 */
export async function buildFrom(siteDir, explicit = []) {
  const root = locate(siteDir, knownSites(explicit))?.path ?? resolve(siteDir);
  const { site } = await import(pathToFileURL(join(root, 'site.config.js')).href);
  const { pages } = await import(pathToFileURL(join(root, 'pages.js')).href);

  /*
   * Checked here, once, before a single page renders: the config is read by every
   * page and by the header and footer, and a wrong key in it would otherwise surface as
   * a `TypeError` from inside the library instead of a sentence naming the key.
   */
  return buildSite({ root, site, pages });
}

if (isMain(import.meta.url)) {
  const { explicit, rest } = takeSitesFlag(process.argv.slice(2));
  const result = await buildFrom(rest[0] ?? '.', explicit);
  console.log(`built ${result.pages} pages → ${relative(process.cwd(), result.out)}`);

  if (result.unreferencedAssets.length) {
    console.warn(`warn: ${result.unreferencedAssets.length} asset(s) not directly referenced in generated output (copied anyway): ${result.unreferencedAssets.join(', ')}`);
  }
}
