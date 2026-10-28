import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { starterThemes } from '../../src/themes.js';
import { copyIconLicense } from '../../src/cli/build.mjs';
import { llmsText } from '../llms.mjs';
import { stylesheet } from '../../src/cli/styles.mjs';
import { replaceOutput } from '../../src/cli/output.js';
import { expand } from '../tables.mjs';
import { renderExample } from './examples.mjs';
import { renderMarkdown } from './markdown.mjs';
import { pagesToBuild, resolveDocLink } from './pages.mjs';
import { navigation, shell } from './shell.mjs';

const LIB = fileURLToPath(new URL('../../', import.meta.url));
const RUNTIME = ['nav', 'theme'];

async function writeAsset(out, directory, extension, content) {
  const hash = createHash('sha256').update(content).digest('hex').slice(0, 8);
  const href = `${directory}/docs.${hash}.${extension}`;
  await mkdir(join(out, directory), { recursive: true });
  await writeFile(join(out, href), content);
  return href;
}

export async function buildDocs(out) {
  return replaceOutput(out, {
    root: LIB, owner: 'JamShoot Design documentation output v1\n',
    sources: ['docs', 'src', 'scripts', 'test', 'node_modules', '.git', '.github', '.githooks'].map((name) => join(LIB, name)),
  }, generateDocs);
}

async function generateDocs(out) {
  const themes = starterThemes('light');
  const pages = await Promise.all(pagesToBuild().map(async (page) => {
    const source = await readFile(page.path, 'utf8');
    return { ...page, source: expand(source), title: source.match(/^#\s+(.*)$/m)?.[1] ?? page.slug };
  }));
  const slugs = new Map(pages.map((page) => [resolve(page.path), page.slug]));
  const css = await stylesheet(themes, [fileURLToPath(new URL('./styles.css', import.meta.url))]);
  const js = (await Promise.all([
    readFile(join(LIB, 'scripts/docs/navigation.js'), 'utf8'),
    ...RUNTIME.map((name) => readFile(join(LIB, 'src/runtime', `${name}.js`), 'utf8')),
  ])).join('\n;\n');

  const cssHref = await writeAsset(out, 'styles', 'css', css);
  const jsHref = await writeAsset(out, 'scripts', 'js', js);
  await cp(join(LIB, 'docs/assets/brand'), join(out, 'brand'), { recursive: true });
  await cp(join(LIB, 'src/tokens'), join(out, 'src/tokens'), { recursive: true });
  await copyIconLicense(out);

  for (const page of pages) {
    // Keep catalog and Markdown links identical in a checkout and on a static host.
    const markdownPath = join(out, relative(LIB, page.path));
    await mkdir(dirname(markdownPath), { recursive: true });
    await writeFile(markdownPath, page.source);
    const body = renderMarkdown(page.source, renderExample, (href) => {
      if (/^(?:[a-z]+:|\/|#)/i.test(href)) return href;
      const resolved = resolveDocLink(href, page.path, slugs);
      return resolved === href ? relative(LIB, resolve(dirname(page.path), href)) : resolved;
    });
    await writeFile(join(out, `${page.slug}.html`), shell({
      title: page.title, nav: navigation(pages, page.slug), body, cssHref, jsHref, themes,
    }));
  }
  await writeFile(join(out, 'llms.txt'), llmsText());
  return pages.length;
}
