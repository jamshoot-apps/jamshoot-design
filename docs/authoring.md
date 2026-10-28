# Authoring a site

<!-- docs-review: 7066a0d14fe7; reason: Documented case-canonical lock keys and source protection, released marker lifecycle and og-image name=value hints -->

Create the site files, write the content, compose pages with components, then build
and check the output. The build validates component options; lint checks layout
and styling rules.

## Set up

Use Node.js 22 or newer. Install a published version with
`npm install @jamshoot-apps/design`. To use a local source checkout,
create a local archive from a library checkout:

```sh
npm pack --pack-destination /tmp
```

This prints the archive filename. Create a site directory with `content/` and the
following `package.json` so Node treats its `.js` files as ES modules:

```json file="package.json"
{
  "private": true,
  "type": "module"
}
```

From that site directory, install the local archive. Replace the path below with the
actual archive path printed by `npm pack`; no public registry package is assumed:

```sh
npm install /absolute/path/to/archive.tgz
cp node_modules/@jamshoot-apps/design/src/tokens/themes/light.css theme.css
```

Repack and reinstall when you need a newer source snapshot. Always import by
package name, never by an internal source path.

The copied `theme.css` supplies all twelve colour roles and `color-scheme`.
Change those values for the site; only component tokens declared in
`src/tokens/contract.js` and site-prefixed decorative tokens may be added. The starter
palettes are also available as [light](../src/tokens/themes/light.css) and
[dark](../src/tokens/themes/dark.css).

Add the four files below to complete a landing and support site. No custom assets, blocks or
additional palettes are required. Keep `dist/` out of version control. Use
[`llms.txt`](../llms.txt) to choose other components and read their linked contracts.

### Minimal shared configuration

Save as `site.config.js`:

```js file="site.config.js"
export const site = {
  brand: { name: 'Project workspace' },
  nav: { links: [
    { id: 'home', label: 'Home', href: 'index.html' },
    { id: 'support', label: 'Support', href: 'support.html' },
  ] },
  footer: {
    columns: [{ title: 'Explore', links: [
      { label: 'Home', href: 'index.html' },
      { label: 'Support', href: 'support.html' },
    ] }],
    copyright: 'Project workspace',
  },
  runtime: ['nav'],
};
```

`site.config.js` is validated before rendering. A misspelled field fails with its
path and accepted shape. Put page content in `content/`; use `site.config.js` for
shared settings and strings. See [Site configuration](configuration.md).

## Site files

A site has four core inputs and optional blocks.

| File | What it holds |
| --- | --- |
| `site.config.js` | Shared brand, navigation, footer and contact settings. |
| `theme.css` | Twelve colour roles, `color-scheme` and optional whitelisted component tokens. |
| `content/*.js` | Page text and content data. |
| `pages.js` | Component calls in page order. |

Edit copy in `content/`, page structure in `pages.js`, and colours in `theme.css`.

Add a palette in `themes/<name>.css`, setting only what differs from `theme.css`.
Use `light.css` or `dark.css` for a palette that follows the system colour preference.
Other names identify palettes readers can select. In `site.config.js`, set
`theme: { toggle: true }` and include `theme` in `runtime` to show the header's theme
control. See [Theming](theming.md).

## Write content as data

A content file exports plain data. Save this as `content/home.js`; keep component
calls and imports in `pages.js`.

```js file="content/home.js"
export const home = {
  hero: {
    eyebrow: 'Project workspace',
    title: 'Keep your project notes and tasks together.',
    lead: 'Create a project, collect your notes and track the next task.',
    facts: [
      { term: 'Organize', value: 'Group notes and tasks by project. Keep meeting notes beside the decisions and next steps they produced, so the team can find the context before starting work.' },
      { term: 'Review', value: 'Read the open tasks before the next meeting. Record what changed and which questions still need an answer, then choose the next task for each project.' },
      { term: 'Export', value: 'Save notes as Markdown and tasks as CSV. Keep a readable copy of completed work alongside the project files when the team is ready to close the project.' },
    ],
  },
  questions: {
    title: 'Before you start',
    group: 'Project files',
    items: [{
      question: 'How do I keep a copy?',
      answer: 'Export notes and tasks from the project menu before moving or closing a project.',
    }],
  },
  closing: {
    title: 'Find the next step for your project.',
    label: 'Read support',
    href: 'support.html',
  },
};
```

Save the support document as `content/support.js`. Its section data can also be used
for a policy page; replace the illustrative text with the product's actual policy.

```js file="content/support.js"
export const support = {
  title: 'Support',
  description: 'Find project files and keep a readable copy of your work.',
  sections: [{
    id: 'project-files',
    title: 'Keep a copy of your project',
    paragraphs: [
      'Open the project menu to export notes as Markdown and tasks as CSV. Choose a destination folder you can find again, then open the exported files to check their contents before closing the project.',
      'If an export does not contain what you expected, keep the original project folder and record the app version and the steps you followed. Include those details when asking for help so the issue can be reproduced.',
    ],
    list: ['Keep the original project until you have checked the exported files.'],
  }],
};
```

Use the component's field names: `term` and `value` for a proof point, `question`
and `answer` for an FAQ, `title` and `body` for a card. `pages.js` can pass the data
directly to the component. An invalid key fails the build with its location and
the accepted options.

Some options accept inline markup such as `<a>` and `<em>`; check the component's
README. Use only trusted authored content in those options. Validation does not
sanitize HTML. Plain text options are escaped.

## Compose pages

`pages.js` exports a named `pages` array of `{ id, path, meta, render }`. Each page
requires `meta.title` and `meta.description`; `path` is a relative `.html` path below
`dist/`. A file named `index.html` is served at its directory: `index.html` is the
site root, and `docs/index.html` is `docs/`. Its canonical URL, `og:url` and
`sitemap.xml` entry use that directory address. Other paths keep their file name, such
as `docs/support.html`. `render({ site })` returns the content inside `<main>`. The
template adds the header, footer, `<head>` and skip link using `site.config.js`.

Save this as `pages.js` to render both content files. The landing page composes
Hero → Section → Subsection → CTA. The support page pairs Page header with Legal
document at their default narrow width. Header and Footer come from the template;
neither belongs in `render`.

```js file="pages.js"
import { hero, proof, section, subsection, faq, cta, button, pageHeader, legalDocument } from '@jamshoot-apps/design';
import { home } from './content/home.js';
import { support } from './content/support.js';

export const pages = [{
  id: 'home',
  path: 'index.html',
  meta: {
    title: home.hero.title,
    description: home.hero.lead,
  },
  render: () => [
    hero({
      title: home.hero.title,
      lead: home.hero.lead,
      proof: proof({ items: home.hero.facts }),
    }),
    section({
      title: home.questions.title,
      content: subsection({
        title: home.questions.group,
        content: faq({ items: home.questions.items }),
      }),
    }),
    cta({
      title: home.closing.title,
      actions: button({ label: home.closing.label, href: home.closing.href }),
    }),
  ],
}, {
  id: 'support',
  path: 'support.html',
  meta: { title: support.title, description: support.description },
  render: () => [
    pageHeader({ title: support.title }),
    legalDocument({ sections: support.sections }),
  ],
}];
```

From the site directory, build this starter and check its generated `dist/`:

```sh
npx --no-install jamshoot-build .
npx --no-install jamshoot-lint .
```

The result is `dist/index.html`, `dist/support.html`, a shared stylesheet and the
selected navigation runtime. Build first, then lint the current output; build does
not run lint. The example below is another composition, not an additional starter file.

### Page headings

Use Hero or Page header for a page's `h1`. Section and CTA titles and Legal document
clause headings render as `h2`. Subsection adds an `h3` below a section title and
demotes headings in its content: the FAQ question in the landing page above becomes
`h4`. A nested Subsection moves its content down another level. Component heading
sizes stay the same when their semantic level changes.

```example title="A section, assembled the way pages.js does it"
section({
  id: 'workflow',
  eyebrow: 'How it works',
  title: 'From an empty project to a saved result.',
  lead: 'Create, organize and export your work.',
  content: steps({
    items: [
      { title: 'Create', body: 'Start a project and give it a name.' },
      { title: 'Organize', body: 'Add tasks and group them by topic.' },
      { title: 'Export', body: 'Save a copy of the completed project.' },
    ],
  }),
})
```

A typical landing page uses `hero`, three or four `section`s, then `cta`. A legal
or support page can use `pageHeader`, an optional `section`, then `legalDocument`.

## Choose components

Every component takes one options object and validates its fields. Invalid options
produce an error listing the accepted values.

- Layout: `stack`, `cluster`, `grid`, `split`, `container`.
- Lists: `steps`, `faq`, `proof`, `definitions` take
  `items`. `plan` takes `features`; `table` takes `columns` and `rows`.
- Page regions: `section`, `hero`, `cta`, `pageHeader`.
- Groups within a region: `subsection`.
- Smaller elements: `button`, `badge`, `note`, `icon`, `figure`, `card`.

[`llms.txt`](../llms.txt) is the compact component catalog. Follow a component link for its complete
contract and examples.
Use [Choosing molecules](molecules.md) to choose between cards, facts, tables and other content structures.

### Component example context

Component examples are JavaScript expressions, not complete site files. In an
existing site's `pages.js`, import the components named in an example from
`@jamshoot-apps/design` and include the expression in a page's `render()` result.
Copy user-facing strings into `content/`; replace illustrative links with real
destinations. The [starter](#compose-pages) shows the surrounding page structure.

Examples using `h()` belong in site-owned blocks: import components from
`@jamshoot-apps/design` and helpers from `@jamshoot-apps/design/markup`. Export a renderer
that returns the expression, then import that block into `pages.js`. See
[site blocks](#add-site-specific-blocks) and [Markup helpers](foundations/markup.md).
Documentation examples have both sets of functions in scope automatically.

Interactive examples labelled static previews show markup only. Their pages state
the runtime, assets and composition required for a working integration.

### Choose atoms

Atoms are small primitives. Start with the component that owns the whole task;
use an atom directly when composing content or a site-owned block.

| Task | Choose |
| --- | --- |
| A navigation action | [Button](../src/components/atoms/button/README.md); custom actions belong in a block. |
| A status beside another element | [Badge](../src/components/atoms/badge/README.md). |
| A standalone fact | [Chip](../src/components/atoms/chip/README.md), or [Proof](../src/components/molecules/proof/README.md) for a list under a hero. |
| A label above a title | The `eyebrow` option on Hero or Section; [Eyebrow](../src/components/atoms/eyebrow/README.md) in a custom block. |
| A caveat or footnote | [Note](../src/components/atoms/note/README.md). |
| An inline SVG or a decorative marker on a square | [Icon](../src/components/atoms/icon/README.md) or [Icon tile](../src/components/atoms/iconTile/README.md). |
| Template branding and navigation | [Site configuration](configuration.md) and [Header](../src/components/organisms/header/README.md); [Brand](../src/components/atoms/brand/README.md) and [Navigation toggle](../src/components/atoms/navToggle/README.md) describe the primitives. |
| Palette switching | [Theming](theming.md) for template setup; [Theme toggle](../src/components/atoms/themeToggle/README.md) for the control contract. |
| Long-form content | [Legal document](../src/components/organisms/legalDocument/README.md), or [Prose](../src/components/atoms/prose/README.md) in a block. |
| Additional text for assistive technology | [Visually hidden](../src/components/atoms/visuallyHidden/README.md) in a block. |

If a component almost fits, use a [site block](#add-site-specific-blocks) for a local
variation or follow [Adding a component](adding-a-component.md#decide-where-the-change-belongs)
for a shared library change. Keep layout and typography within the library contract.

## Correct invalid options

For example, this configuration uses a value Button does not accept:

```js
button({ label: 'Home', href: 'index.html', variant: 'secondary' })
```

The component throws this diagnostic when called, including during a page build:

```text
button(): "variant" must be one of "primary", "ghost". See src/components/atoms/button/README.md.
```

Read the linked contract and choose an allowed value:

```example title="Corrected button variant"
button({ label: 'Home', href: 'index.html', variant: 'ghost' })
```

Rebuild after correcting an error, then run lint on the new output. Lint diagnostics
name the rule, source location and detail; [Rules](anti-patterns.md) explains each
rule. A successful build or lint run does not replace the pre-launch checks below.

## Three enforced rules and one authoring convention

- Compose pages with components; put custom markup in blocks
  ([page-markup](anti-patterns.md#page-markup-a-page-that-writes-markup-by-hand)).
- Keep colours in palettes, with decorative tokens under a site prefix such as
  `--project-paper`
  ([theme-colour](anti-patterns.md#theme-colour-colour-outside-the-theme),
  [theme-contract](anti-patterns.md#theme-contract-a-project-token-outside-the-contract)).
- Use spacing and radius tokens
  ([scale](anti-patterns.md#scale-a-size-that-is-not-on-a-scale)).

**Authoring convention:** keep page copy in `content/` and strings shared across
pages in `site.config.js`. Review enforces this boundary; lint checks copy tone,
not where every user-facing string lives.

## Omit optional content

`null` and `undefined` omit an option or child. `false` omits content, but is an
explicit answer for a boolean option such as `hideOnScroll` or `showContact`.

```example title="A button with nowhere to go renders nothing"
cluster({
  content: [
    button({ label: 'Live link', href: '#' }),
    button({ label: 'Not launched yet', href: null }),
  ],
})
```

The second button renders nothing. Keep `site.appStore.href` as `null` until the
App Store listing is live, so the site can launch without a dead download link.

## Add site-specific blocks

Put UI used only by this site in `blocks/`.

- `blocks/thing.js` — the build-time renderer, imported by `pages.js`. It stays out
  of browser output and may import `@jamshoot-apps/design/markup`.
- `blocks/thing.client.js` — behaviour. The `.client.js` suffix is what decides
  whether code reaches the browser.
- `blocks/thing.css` — styles. The build puts them in the `site.blocks` cascade layer,
  which takes precedence over library styles. Do not write `@layer` yourself. See
  [the layer rule](anti-patterns.md#layer-a-stylesheet-that-assigns-its-own-cascade-layer).

A block may compose anything exported by `@jamshoot-apps/design`, use the markup helpers,
and read the design system's primitive, role and component tokens. It follows the
same spacing, colour, motion and accessibility rules as library components.

Import the renderer into `pages.js`. The build puts its HTML in the page and adds
its CSS and optional client file to the site's hashed stylesheet and script.

Promote a block when a second site needs it; see
[Adding a component](adding-a-component.md).

Pointer parallax and other illustration effects belong to the site's client block.
The library provides only component behavior (`nav`, `theme`, `faq`); it does not
provide `window.dsParallax`. For an existing site using `runtime: ['parallax']`,
move the effect into `blocks/illustration.client.js` and remove `parallax` from
`runtime`. Keep initialization and scene configuration together in that file,
scope queries to the illustration, honor reduced motion, and stop requesting frames
when the pointer target and layer positions have settled. A stationary pointer away
from the center is a resting state too.

## Configure shared page elements

The template builds the [Header](../src/components/organisms/header/README.md)
and [Footer](../src/components/organisms/footer/README.md) from
[site configuration](configuration.md).

### Header on scroll

The header stays visible by default. To hide it on downward scroll and reveal it
on upward scroll, set these fields in `site.config.js`:

```js
nav: { hideOnScroll: true, links: [/* site navigation */] },
runtime: ['nav'],
```

Keep any other runtime modules the site uses. See the
[Header interaction details](../src/components/organisms/header/README.md#scroll-and-interaction)
and [configuration contract](configuration.md).

### Footer content

`footer.blurb` is optional. Set `footer.showContact: false` to hide the footer email
while keeping `contact.email` available to other pages. Contact is shown by default.
When both the description and email are hidden, link columns fill the footer width.

## Structured data and page paths

Add structured data with `jsonLd` in site configuration or on a page. The template
escapes `<` as a JSON Unicode sequence, so values containing `</script>` stay inside
the JSON and round-trip through `JSON.parse` unchanged.

The build adjusts stylesheet and script links for each page's directory. For example,
`guide/topic/index.html` links to `../../styles/…` and `../../scripts/…`.

Shared Header/Footer links and brand images in `site.config.js` are relative to the
site root. Write `support.html` and `assets/logo.svg` once; the template prefixes
them with `../../` on that nested page. This also applies to favicon and touch-icon
paths. Scheme URLs, leading-slash paths, query-only links and fragments stay as
authored. Links in page sections and site blocks remain relative to the page file.

### Not-found page

Set `notFound: true` on one page and configure the host to serve it for missing URLs
(for example, Apache's `ErrorDocument 404 /404.html`). The build excludes this page
from `sitemap.xml`, adds `noindex` and omits its canonical URL.

The build rewrites its relative links from the configured site root. A site under
`/app/` therefore loads `/app/styles/…` and `/app/scripts/…` even at a missing URL.
Write content links relative to the page file: from `errors/404.html`, use
`../support.html` to reach the top-level Support page. The build then rewrites them.

The rewrite handles double-quoted, single-quoted and unquoted URL attributes,
whitespace around `=`, and uppercase attribute names. It preserves commas within
`srcset` URLs, including CDN transformations and data URLs, and keeps each candidate's
width or density descriptor.

It also rewrites URLs inside `noscript`, so fallback links and images work at missing
addresses with JavaScript disabled. Comments, CDATA and the text of scripts, styles
and textareas remain unchanged.

## Build and lint

From the library checkout, all runners accept the site directory directly:

```sh
node src/cli/build.mjs /path/to/site
node src/cli/lint.mjs /path/to/site
node src/cli/dev.mjs /path/to/site
```

Build before linting so output checks inspect the current generation. Without
`dist/`, lint reports those checks as skipped; with an existing `dist/`, it checks
that output. The build does not run lint automatically.

To use a site name, pass `--sites /path/to/sites` or set `JAMSHOOT_SITES`. You can also
run an installed runner from the site directory, as in the starter above. Runners
do not search neighbouring repositories.

The local watcher runs one rebuild at a time. Changes arriving during a rebuild
produce one subsequent build after the save burst settles. A failed rebuild does
not block later changes, and closing the watcher cancels queued work. It follows
files replaced by editor saves and detects newly created optional source directories.
Only changes to the configured source paths trigger rebuilding; output changes do not.
Watching starts before the initial build, which uses the same queue, so changes
made during startup also trigger a subsequent build.

The preview server binds to `127.0.0.1` and answers only requests addressed to
`127.0.0.1` or `localhost` on its port; other host names, such as a DNS-rebound
domain, receive `421`. A directory URL without its trailing slash redirects with
`301` to the slash form (`/docs` to `/docs/`), so page-relative links resolve as they
do on a static host. An extensionless URL serves `about.html` when that file exists,
even beside an `about/` directory. Choose a port with `--port 5000` or `--port=5000`,
before or after the site name.

## What ships

The site uses system fonts by default. For custom fonts, declare site-owned files
under `assets/` in `site.config.js`. The build copies the files and their notices.

Icons are inlined as SVG at build time. The eight component icons are built in;
`JAMSHOOT_ICONS_DIR` adds content icons and overrides built-ins by filename. A configured
directory must exist. Site and docs builds include the built-in icons' MIT notice
at `licenses/ionicons.txt`; retain it when publishing. Put notices for your own
icons in the site's `assets/` so they ship too. See the [icon guide](foundations/icons.md).

Pages share one content-hashed stylesheet and, when JavaScript is needed, one
content-hashed script. The build joins the selected runtime and client blocks with
statement separators. Component renderers and site configuration remain build-time code.

`src/cli/styles.mjs` assembles CSS layers for site and documentation builds. Site font
faces go in `ds.theme`; block styles go in `site.blocks`.

The build copies every file in a site's `assets/`, preserving its directories, except
Finder's `.DS_Store`. Files not directly referenced in generated output produce a
warning; nested references or URLs assembled by a script may still need them. A
warning never removes a source asset. Each build writes a fresh generation in a
temporary sibling directory. After all rendering, asset copies and transformations
succeed, it replaces the previous output; a failed build preserves the previous
generation. Removed pages, assets and old hashed bundles therefore disappear on a
successful rebuild. Keep hand-maintained files in source, never in `dist/`.

Programmatic `buildSite({ root, site, pages, out })` follows the same behavior.
`out` must be a dedicated output directory: it cannot contain the site root or sit
inside `assets/`, `blocks/`, `content/`, `themes/`, `node_modules/` or `.git/`.
It must be absent, empty, or contain the build's `.jamshoot-build` ownership marker;
populated unowned directories, files and symlinks are refused. For output made by an
older version without this marker, move the old directory aside once before building.
Do not add the marker to a directory of source files.
Path checks resolve symlinked ancestors and on-disk letter case, so an alias cannot
bypass source protection.
Directory replacement uses a backup and rollback; it is not a deployment mechanism
for a live production server. The local preview server can briefly return `503`
during replacement; it handles missing files without stopping and reloads after a
successful build.

Calls to `buildSite` targeting the same output in one process run in order, including
calls queued after a failed build and calls spelling the output in different letter
case. Separate processes exclude each other with lock files in the system temporary
directory; nothing is written into the site directory. Each lock is named from the
user id and the canonical output path, so a directory reached through a symlink or a
different letter case shares its lock. A build that finds a live lock fails before
output changes and names the holding process and the lock file. A lock left by a
killed build is superseded by the next build, and a lock written before the last
reboot is ignored. After a build, one small `released` marker per output path
remains in the temporary directory; the next build supersedes and removes it. If a
build reports a lock while no build is running (a process id reused by another
program), delete the named file. Different outputs have independent locks.

Documentation builds (`npm run docs`, optionally `-- --out <directory>`) use the same
generation replacement and source protection. They refuse the repository root, its
ancestors and source directories, and use a separate ownership marker value from site
builds. A rendering or copy failure leaves the previous documentation intact. Existing
unmarked documentation output must also be moved aside once before rebuilding.

## Open Graph images

Share images are optional. Site builds do not run the OG generator or require a
browser. If `ogImage` is omitted, the template omits the image metadata and uses
the `summary` Twitter card. A configured image is referenced as authored; the site
build does not check that the image exists or is current.
Lint reports an `og-image` error if a configured local file is missing; omitting
`ogImage` is allowed. Remote image URLs are not fetched. This check does not block
the ordinary build. If build output exists, lint also checks that it contains the
image; without a build, it checks only the source file. Keep local share images under
`assets/` so they are copied into the output.

To use a ready-made PNG, place it under `assets/` and configure its path and intrinsic
dimensions alongside the site's public URL:

```js
url: 'https://example.com/',
ogImage: { path: 'assets/images/og.png', width: 1200, height: 630 },
```

The build copies the image and emits its absolute `og:image` URL and dimensions.
The public `url` is required for image metadata.

`src/cli/og-image.mjs` generates a 1200×630 share image from the site's palette, logo and
optional local fonts. It uses the system font stack when no faces are configured.
PNG generation runs a Chromium-family executable in headless mode; `--check` needs no browser.
Install Chromium (a headless-capable executable), Chrome, Brave or Edge separately;
the toolkit does not install or download a browser. Pass its executable path with
`--chrome` or set `CHROME`. macOS installations under `/Applications` are detected
automatically; on other systems, provide the path explicitly. HTML previews need
no browser. Browser lookup or rendering failures fail only this separate command,
unless your own build script explicitly invokes it.

```sh
npx --no-install jamshoot-og-image /path/to/site --html /tmp/card.html
npx --no-install jamshoot-og-image /path/to/site --chrome /path/to/chromium
npx --no-install jamshoot-og-image /path/to/site --check
```

For a Linux installation whose executable is `/usr/bin/chromium`, use
`--chrome /usr/bin/chromium`. Headless flags are supplied by the generator.

`--pattern` selects a texture; `all` writes one file per pattern. Both `scatter` and
`all` use `star`, `star-outline` and `sparkles-outline` by default. Supply those icons
through `JAMSHOOT_ICONS_DIR`, or select built-in icons with
`--scatter-icons menu,close,checkmark`.

`--icon`, `--title` and `--subtitle` override site defaults;
`--bg` takes a surface role or colour, and `--ink` takes `light` or `dark`. Sizes
(`--icon-size`, `--title-size`, `--subtitle-size`) are positive integers. Unknown flags
and missing values fail instead of being silently ignored.

`--out` sets the output path, relative to the site root unless absolute. The tool
creates parent directories. Without `--out`, it uses `ogImage.path` or
`assets/images/og-banner.png`. `--out`, `--check` and `--html` each require a single pattern.
Each generated PNG carries a `jamshoot-og-source` text chunk holding a SHA-256 of the
card it was rendered from, together with the canvas size and a render pipeline
version. `--check` does not render: it fails if the file is missing, has no such
chunk (an image made by hand must be regenerated once) or was rendered from a
different card. Run `--check` with the same card flags used for generation
(`--pattern`, `--bg`, `--ink`, `--title`, `--subtitle`, `--icon`, the size flags,
`--scatter-icons` and `--out`); a failure prints the regeneration command with those
flags, each written as `--name=value`. For `scatter`, `JAMSHOOT_ICONS_DIR` must also
match; the printed command does not repeat it. If the browser exits without writing
a valid PNG, the existing file is left unchanged and the command fails. Pixels are
not compared, so the result is the same across browsers, operating systems and font
rasterisers. `--html` and `--check` cannot be combined.

## Verify before launch

- Lint is clean and the build contains every page's text without client JavaScript.
- Check 390 px, 1024 px, and 1440 px with no horizontal overflow.
- With JavaScript disabled, all content remains readable and native details such as
  FAQ items still work.
- With Reduce Motion enabled, animated elements have a useful resting state.
- Keyboard traversal exposes the skip link, visible focus, and usable mobile menu.
- Canonical and Open Graph URLs, `sitemap.xml`, and `robots.txt` use the production
  origin.
- Favicon and touch-icon dimensions match their slots.
- Legal copy and effective dates match the product's source of record.
