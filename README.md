# JamShoot Design

JamShoot Design helps you build static websites with reusable JavaScript components, consistent styling and no extra dependencies.

Components render HTML at build time, so there's no client-side framework to ship. You bring the content, colours and any custom blocks. JamShoot takes care of the layout, typography, styling and motion.

[Documentation](https://jamshoot-apps.github.io/jamshoot-design/) ·
[Authoring guide](https://jamshoot-apps.github.io/jamshoot-design/authoring.html) ·
[Component catalog](llms.txt) ·
[Changelog](https://github.com/jamshoot-apps/jamshoot-design/blob/main/CHANGELOG.md)

## Features

- No npm dependencies. Everything runs on the Node.js standard library.
- Components render static HTML during the build. The browser only gets
  small scripts for the mobile menu, theme switching and FAQ links, plus
  whatever client code a site adds itself.
- Each component declares its options with `defineComponent`, so you'll
  know during the build if something isn't quite right.
- Customise your site's colours using twelve predefined roles. 
  Light and dark themes are included, along with a theme toggle.
- `jamshoot-lint` checks for accessibility and design issues like contrast,
  focus styles, tap target size, reduced motion and more. Each rule is
  explained in the docs.
- API tables are generated from the component code, and README examples run as tests. When
  components change, the checks help make sure the docs don't fall behind.
- [`llms.txt`](llms.txt) is a short generated index of all components, handy
  for people and coding assistants alike.

## Install

Requires **Node.js 22 or newer**.

```sh
npm install @jamshoot-apps/design
```

## Quick start

Here's a small example of how components fit together. For a complete working site, see the authoring guide.

A site is just a folder with a few files:

```text
my-site/
├── site.config.js   # brand, URL, navigation, footer
├── theme.css        # twelve colour roles and color-scheme
├── pages.js         # pages composed from components
├── content/         # user-facing strings
├── blocks/          # optional site-specific markup
└── themes/          # optional extra palettes
```

Pages import components from the public package. Each component takes one options
object:

```js
import { card, grid, section } from '@jamshoot-apps/design';

const features = section({
  id: 'features',
  title: 'What it does.',
  content: grid({
    content: [
      card({ title: 'Offline', body: 'No account or network required.' }),
      card({ title: 'Fast', body: 'Static pages with no client framework.' }),
    ],
  }),
});
```

Build the site into `dist/` and lint the source and output:

```sh
npx --no-install jamshoot-build .
npx --no-install jamshoot-lint .
```

If an option is wrong, the build stops with an error like this:

```text
button(): "variant" must be one of "primary", "ghost". See src/components/atoms/button/README.md.
```

The [authoring guide](https://jamshoot-apps.github.io/jamshoot-design/authoring.html)
walks through a complete two-page site and a pre-launch checklist.

## Command-line tools

| Command | Purpose |
| --- | --- |
| `jamshoot-build` | Prerenders pages, validates options and writes content-hashed assets to `dist/`. Failed builds keep the previous output. |
| `jamshoot-lint` | Checks the theme, authored code and generated output against the design rules. |
| `jamshoot-dev` | Serves a site locally with live reload. |
| `jamshoot-og-image` | Generates Open Graph share images. |

## How it is organised

| Layer | Owned by | Provides |
| --- | --- | --- |
| Design tokens | Library | Spacing, type scale, radii, motion and breakpoints. |
| Site theme | Site | Twelve colour roles and allowed component tokens. |
| Components | Library | Validated HTML and namespaced CSS built from tokens. |
| Pages and blocks | Site | Components composed with the site's content and custom UI. |

Read more in [Architecture](https://jamshoot-apps.github.io/jamshoot-design/architecture.html),
[Theming](https://jamshoot-apps.github.io/jamshoot-design/theming.html) and
[Rules](https://jamshoot-apps.github.io/jamshoot-design/anti-patterns.html).

## Development

From a source checkout:

```sh
npm run serve   # documentation with live reload at http://127.0.0.1:4180
npm test        # unit, integration, documentation and lint checks
```

Tests build a self-contained fixture site and need no network or private assets.
See [Contributing](https://github.com/jamshoot-apps/jamshoot-design/blob/main/CONTRIBUTING.md)
for the full set of required checks.

## Security

Plain text options are escaped; options that accept HTML expect trusted content.
Report vulnerabilities through the
[security policy](https://github.com/jamshoot-apps/jamshoot-design/blob/main/SECURITY.md).

## Licence

[Apache License 2.0](LICENSE). Built-in icons are derived from Ionicons and keep
their [MIT notice](src/assets/icons/LICENSE.txt). JamShoot brand artwork used by the
documentation is excluded from Apache 2.0 and not included in the npm package. See
[NOTICE](NOTICE) for details.
