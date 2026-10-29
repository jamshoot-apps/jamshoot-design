# Site configuration

<!-- docs-review: 16b61a6a86b6; reason: Reviewed brand.href, footer.groups, generated intros and theme control names section -->

`site.config.js` exports `site`. The build validates it before writing output.
Navigation and footer fields reuse the Header and Footer component contracts;
the template supplies their options, brand lockup, theme control and build-year
copyright on every page.

Shared navigation, footer links and brand image paths are relative to the site root;
the template adjusts them for nested pages. URLs in page content remain relative
to that page. See [Page paths](authoring.md#structured-data-and-page-paths).

## Start with the required fields

The smallest configuration needs a product name, navigation links, footer groups
and copyright. Add the optional blocks below as the site needs them.

```js
export const site = {
  brand: { name: 'Example' },
  nav: {
    links: [{ label: 'Support', href: 'support.html' }],
  },
  footer: {
    groups: [{ title: 'Help', links: [{ label: 'Support', href: 'support.html' }] }],
    copyright: (year) => `© ${year} Example`,
  },
};
```

```options siteConfig
## Site identity

Set the document language, public origin, product name, brand images and the brand link. Only `brand.name` is required in this block.

| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `lang` | `string` | default `en` | The document language. `en` unless the site is not in English. |
| `url` | `string` | optional | The site’s own origin. Empty until it has a domain — canonical and og:url are left out until then. |
| `brand` | `{ name, tagline, logo, favicon, appleTouchIcon, href }` | required | The name and the marks that carry it. |
| `brand.name` | `string` | required | The product name, spelled the way the app spells it. |
| `brand.tagline` | `string` | optional | One line on what it does. Used where a name alone is not enough. |
| `brand.logo` | `string` | optional | The lockup image, shown in the header. |
| `brand.favicon` | `string` | optional | The browser-tab icon. |
| `brand.appleTouchIcon` | `string` | optional | The home-screen icon. |
| `brand.href` | `string` | default `index.html` | Where the brand lockup links. |

## Download and contact

Set the download button text and destination, support email and developer name. Both objects are optional; download buttons appear when `appStore.href` is supplied.

| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `appStore` | `{ label, href }` | optional | The one call to action on the site. |
| `appStore.label` | `string` | required | What every download button says. |
| `appStore.href` | `string` | optional | The listing. Null until it is live, which leaves every download button out of the page. |
| `contact` | `{ email, developer }` | optional | The channels the site publishes. Nothing here promises a response time. |
| `contact.email` | `string` | optional | The one address, shown in the footer and on the support page. |
| `contact.developer` | `string` | optional | Who ships it, for the legal pages. |

## Header navigation

Set the header links and accessible labels. `nav.links` is required; `skipLink` labels the first link keyboard users reach, which takes them to the main content. The menu and theme icons are built in; see the [icon guide](foundations/icons.md) for custom icons.

| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `nav` | `{ links, label, toggleLabel, hideOnScroll }` | required | The header navigation. |
| `nav.links` | `non-empty array of { label, href, id }` | required | The navigation links, in reading order. |
| `nav.links[].label` | `string` | required | What the link says. |
| `nav.links[].href` | `string` | required | Where the link goes. |
| `nav.links[].id` | `string` | optional | Matches activeId to mark the current page. |
| `nav.label` | `string` | default `Primary` | The accessible name of the navigation. |
| `nav.toggleLabel` | `string` | default `Toggle navigation` | The accessible name of the mobile menu button. |
| `nav.hideOnScroll` | `true or false` | default `false` | Hide on downward scroll and reveal on upward scroll. Requires the nav runtime. |
| `skipLink` | `string` | default `Skip to main content` | The first thing a keyboard reaches on every page. |

## Footer

Set the link groups and copyright notice shown on every page. Both are required. The footer shows `contact.email` when supplied unless `footer.showContact` is false.

| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `footer` | `{ blurb, showContact, groups, copyright, legalNote }` | required | The footer, on every page. |
| `footer.blurb` | `string` | optional | An optional product description beside the link groups. |
| `footer.showContact` | `true or false` | default `true` | Show the contact email when one is supplied. |
| `footer.groups` | `non-empty array of { title, links }` | required | The link groups, left to right. |
| `footer.groups[].title` | `string` | required | What the group holds. |
| `footer.groups[].links` | `non-empty array of { label, href }` | required | The links in the group. |
| `footer.groups[].links[].label` | `string` | required | What the link says. |
| `footer.groups[].links[].href` | `string` | required | Where it goes. |
| `footer.copyright` | `string, or a function returning one` | required | The notice. Write it as (year) => … so the build resolves the current year. |
| `footer.legalNote` | `string` | optional | Trademark attributions above the copyright line. |

## Search and sharing

Set a default share image and structured data for all pages. Both are optional. Page titles, descriptions and additional structured data belong in [pages.js](authoring.md).

| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `ogImage` | `{ path, width, height }` | optional | The share image. Its size is declared because a card renderer reads it before the file. |
| `ogImage.path` | `string` | required | Path to the image. |
| `ogImage.width` | `number` | required | Intrinsic width in pixels. |
| `ogImage.height` | `number` | required | Intrinsic height in pixels. |
| `jsonLd` | `JSON object or array` | optional | Structured data on every page — typically an Organization or WebSite node. A page can add its own on top with `pages.js`’s `jsonLd`. |

## Theme control

Enable the header theme control when the site has another palette in `themes/`. Set `theme.toggle` to true and include `theme` in `runtime`. See [Theming](theming.md) for palette files.

| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `theme` | `{ toggle, label, auto, action }` | optional | The reader’s side of the palette. Leave it out and every reader gets the site’s own colors; set it when the site declares more than one palette and the reader should be able to choose. |
| `theme.toggle` | `true or false` | default `false` | Put the theme control in the header. Needs a second palette in `themes/`. |
| `theme.label` | `string` | default `Theme` | What the control is called, read before the state it is in. |
| `theme.auto` | `string` | default `Auto` | What the state that follows the operating system is called. |
| `theme.action` | `string` | default `Switch to` | What one click does, read with the next palette’s name after it. |

## Fonts

Omit `fonts` to use the system stack with no font files emitted. To supply a typeface, set its family, fallback stack and files for each role you replace. Paths must be normalized local .woff2 paths under `assets/`, such as `assets/fonts/display.woff2`; parent segments, URL escapes, query strings and fragments are rejected.

| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `fonts` | `{ display, sans, mono }` | optional | The site’s own typefaces. Leave it out for system fonts; set a role to replace its face while keeping the library scale. |
| `fonts.display` | `{ family, fallback, files }` | optional | Headings, h1 to h4. Falls back to `sans` when left out. |
| `fonts.display.family` | `string` | required | The family name, as the @font-face will declare it. |
| `fonts.display.fallback` | `string` | required | The platform stack it falls back to while it loads — `Georgia, serif`. |
| `fonts.display.files` | `non-empty array of { weight, path }` | required | One woff2 per weight the site uses, in assets/. |
| `fonts.display.files[].weight` | `number` | required | A weight on the scale: 400, 500, 600, 700. |
| `fonts.display.files[].path` | `string` | required | A normalized local .woff2 path under assets/, relative to the site root. |
| `fonts.sans` | `{ family, fallback, files }` | optional | Everything else: body copy, controls, labels. |
| `fonts.sans.family` | `string` | required | The family name, as the @font-face will declare it. |
| `fonts.sans.fallback` | `string` | required | The platform stack it falls back to while it loads — `Georgia, serif`. |
| `fonts.sans.files` | `non-empty array of { weight, path }` | required | One woff2 per weight the site uses, in assets/. |
| `fonts.sans.files[].weight` | `number` | required | A weight on the scale: 400, 500, 600, 700. |
| `fonts.sans.files[].path` | `string` | required | A normalized local .woff2 path under assets/, relative to the site root. |
| `fonts.mono` | `{ family, fallback, files }` | optional | Code and anything set as data. |
| `fonts.mono.family` | `string` | required | The family name, as the @font-face will declare it. |
| `fonts.mono.fallback` | `string` | required | The platform stack it falls back to while it loads — `Georgia, serif`. |
| `fonts.mono.files` | `non-empty array of { weight, path }` | required | One woff2 per weight the site uses, in assets/. |
| `fonts.mono.files[].weight` | `number` | required | A weight on the scale: 400, 500, 600, 700. |
| `fonts.mono.files[].path` | `string` | required | A normalized local .woff2 path under assets/, relative to the site root. |

## Browser runtime

List the runtime modules loaded in the browser. The default is `["nav"]`; keep `nav` for `nav.hideOnScroll` and add `theme` for `theme.toggle`. Site files matching `blocks/*.client.js` are included automatically.

| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `runtime` | `non-empty array of strings` | default `nav` | Library runtime modules this site loads. `blocks/*.client.js` are added on their own. |


Takes:

- `runtime` to list `nav` whenever `nav.hideOnScroll` is on
- `runtime` to list `theme` whenever `theme.toggle` is on
- font files to be .woff2 at a weight on the scale (400, 500, 600, 700)
```

## Shared component mapping

Configure shared page elements in `site.config.js`. Direct `header()` and `footer()`
calls use the component options on the right; the page template performs these
mappings for you. It also uses each page's `id` as Header's `activeId`.

| Site configuration | Component option supplied by the template |
| --- | --- |
| `brand`, including `brand.href` | Header `brand`, rendered with `brand({ compact: true, href })` |
| `nav.links`, `nav.label`, `nav.toggleLabel`, `nav.hideOnScroll` | Header `links`, `label`, `toggleLabel`, `hideOnScroll` |
| `theme` and palette files | Header `theme`, rendered with `themeToggle()` when enabled; needs the `theme` runtime |
| `footer.groups` | Footer `groups` |
| `contact.email` | Footer `email` |
| `footer.blurb`, `footer.showContact`, `footer.legalNote` | Footer `blurb`, `showContact`, `legalNote` |
| `footer.copyright` | Footer `copyright` text; a function receives the build year |

The Header's mobile menu needs the `nav` runtime even with `hideOnScroll: false`.
See [Browser runtime](#browser-runtime) for the module list.

### Theme control names

`theme.label` and `--ds-theme-label` set different text. `theme.label` names the
control, and its default is `Theme`. `--ds-theme-label` in a palette file names that palette's state.
A palette cannot rename the control, and `theme.label` cannot rename a palette.

The button's accessible name is built from three parts: the control name, the state in
force, and what one click does. With the defaults, the fixture's `warm-paper` state reads
`Theme: Warm paper. Switch to Auto.`, where `Switch to` is `theme.action` and `Auto` is the
next state in the cycle. `theme.auto` names the state that follows the operating system.
Screen readers announce these names; sighted readers see only the icon of the state in
force.

A palette without `--ds-theme-label` is named from its file name, with the first letter
capitalized and hyphens read as spaces, so `themes/warm-paper.css` is `Warm paper`. The
base palette, `theme.css`, is named from its `color-scheme` when it declares no label, so
`color-scheme: light` is `Light`. Each palette's icon comes from `--ds-theme-icon` in the
same file.

The available runtime modules are `nav`, `theme` and `faq`. Illustration effects
belong in site-owned client blocks; see [Site blocks](authoring.md#site-blocks)
for parallax migration.

See [Header](../src/components/organisms/header/README.md) for scrolling, keyboard
focus and responsive menu behavior, [Footer](../src/components/organisms/footer/README.md)
for contact and legal content, and [Authoring](authoring.md) for page structure and
build output. As with every component, `npm test` checks their options, examples,
source and declared runtime against their docs.
