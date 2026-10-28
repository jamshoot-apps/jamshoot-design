# JamShoot Design

A dependency-free design system for static websites. JavaScript components render
HTML at build time. Shared CSS defines the layout, typography and component styles;
each site supplies its content, colours and optional custom blocks.

[Documentation](https://jamshoot-apps.github.io/jamshoot-design/) ·
[Authoring guide](https://jamshoot-apps.github.io/jamshoot-design/authoring.html) · [Component catalog](llms.txt) ·
[Contributing](https://github.com/jamshoot-apps/jamshoot-design/blob/main/CONTRIBUTING.md)

## What it includes

- Layout primitives and components for navigation, content, pricing and page regions.
- Validated component options, generated API references and executable examples.
- Twelve semantic colour roles, starter palettes and a theme-switching runtime.
- Static site, documentation and local preview runners, plus source and output lint.
- Built-in interface icons with their MIT licence notice.

The library requires **Node.js 22 or newer** and has no npm dependencies. Component
renderers run in Node; browser behaviour comes from selected runtime modules and
explicit site-owned client scripts. There is no client-side component framework.

## Install

Install the package in a site project:

```sh
npm install @jamshoot-apps/design
```

To use a local source checkout, clone this repository and pack it:

```sh
git clone https://github.com/jamshoot-apps/jamshoot-design.git
cd jamshoot-design
npm pack --pack-destination /tmp
```

Install the `.tgz` path printed by npm from your site directory with
`npm install /path/to/archive.tgz`. No dependency installation is needed in the
library checkout.

Starting with 1.0.0, breaking public API changes increment the major version,
compatible additions increment the minor version, and fixes increment the patch
version. Review the changelog when upgrading.

## Build a site

A site supplies `site.config.js`, `theme.css`, `pages.js` and content files. Optional
`blocks/` and `themes/` directories extend its markup and palettes.

Import components through the public package:

```js
import { card, section } from '@jamshoot-apps/design';

const content = section({
  title: 'Project resources',
  content: card({
    title: 'Documentation',
    body: 'Read the setup and authoring guides.',
  }),
});
```

The [authoring guide](https://jamshoot-apps.github.io/jamshoot-design/authoring.html) contains the complete files for a two-page
site. From a site with the package installed, build and lint it with:

```sh
npx --no-install jamshoot-build .
npx --no-install jamshoot-lint .
```

The build prerenders pages into `dist/` and validates component options. Lint checks
the theme, authored code and generated output. Custom blocks use the separate
`@jamshoot-apps/design/markup` API; sites should not import library internals.

Successful builds replace `dist/` with the current generation; failed builds retain
the previous output.

Sites own their content, twelve colour roles, `color-scheme` and the component tokens
allowed by the [token contract](src/tokens/contract.js). The library owns component
markup, layout, type scale, spacing and motion. Fonts use the system stack unless
the site supplies font assets and configuration.

## Explore the documentation

From a source checkout, run:

```sh
npm run serve
```

The reference runs at `http://127.0.0.1:4180` with live reload. Use
`npm run serve -- --port 5000` to choose another port, or `npm run docs` to build
static documentation into `dist-docs/`.

Start with [site authoring](https://jamshoot-apps.github.io/jamshoot-design/authoring.html),
[the architecture](https://jamshoot-apps.github.io/jamshoot-design/architecture.html), [theming](https://jamshoot-apps.github.io/jamshoot-design/theming.html) or
[the component catalog](llms.txt). Component folders contain their API contracts and
working examples. The same references can be used by developers and coding tools.

## Develop and verify

```sh
npm run tables
npm run llms
npm run docs:review -- --check
npm run docs
npm test
node src/cli/build.mjs test/fixtures/site
node src/cli/lint.mjs test/fixtures/site
npm pack --dry-run
```

Tests and builds use a self-contained fixture site. They need no neighbouring
repository, registry credentials or private assets. See [Contributing](https://github.com/jamshoot-apps/jamshoot-design/blob/main/CONTRIBUTING.md)
for component changes and [Testing](https://jamshoot-apps.github.io/jamshoot-design/testing.html) for the test layout.

[Deployment and releases](https://github.com/jamshoot-apps/jamshoot-design/blob/main/.github/RELEASING.md) describes the three manual GitHub
Actions workflows: documentation on Pages, annotated tags with GitHub Releases, and
npm publication using OIDC trusted publishing. Commits and tags do not start them.

## Security and limitations

Plain text options are escaped. Options that accept authored HTML expect trusted
content; validation does not sanitize HTML. Build and lint checks do not replace
browser, keyboard or assistive-technology testing. Report vulnerabilities using the
[security policy](https://github.com/jamshoot-apps/jamshoot-design/blob/main/SECURITY.md).

## Licence

Library code and documentation are available under [Apache License 2.0](LICENSE).
The Ionicons assets retain their [MIT notice](src/assets/icons/LICENSE.txt). JamShoot
artwork used by the documentation has [separate brand terms](https://github.com/jamshoot-apps/jamshoot-design/blob/main/docs/assets/brand/jamshoot/LICENSE.txt)
and is excluded from Apache 2.0. Component examples use a neutral sample mark.
See [NOTICE](NOTICE) for asset attribution.

## Repository and package layout

All published code and required resources live under `src/`: components, tokens,
shared styles, browser runtime, built-in icons and consumer CLI tools. Public
imports are defined by `package.json.exports`; the commands `jamshoot-build`,
`jamshoot-lint`, `jamshoot-dev` and `jamshoot-og-image` are npm executable entries.
Starter CSS is also exported as `@jamshoot-apps/design/themes/light.css` and
`@jamshoot-apps/design/themes/dark.css`.

The npm archive contains `src/` without behaviour tests, component API READMEs,
`llms.txt`, this README, the Apache licence and NOTICE. Full documentation and its
artwork stay in `docs/`; documentation generators and test tools stay in `scripts/`.
Neither directory is needed to use the installed library. The public repository
also contains shared tests under `test/` and manual workflows under `.github/`.
