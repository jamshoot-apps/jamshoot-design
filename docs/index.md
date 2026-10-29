# Overview

JamShoot Design is a design system for developers building static websites from reusable components.
Use it when pages should share layout and styling while keeping content, colors
and custom interactions local to the site. Compose pages in JavaScript and extend
them with site blocks: custom renderers, styles and client blocks.
It requires Node.js 22+ and has no npm dependencies.

Components render HTML at build time; their renderers stay out of the browser.
One stylesheet uses CSS cascade layers to separate theme, library and site styles.
Browser behavior comes from selected library runtime modules and explicit
`blocks/*.client.js` files.

## Start here

[Authoring a site](authoring.md#set-up) shows package and source installation and a complete
minimal site. Pages compose components through validated options:

```example title="A section containing a card"
section({
  title: 'Project resources',
  content: card({ title: 'Documentation', body: 'Read the setup and authoring guides.' }),
})
```

Put copy in `content/*.js`, composition in `pages.js`, shared options in
`site.config.js` and colors in `theme.css`. From the library checkout, build the
prepared site, then lint its source and output:

```sh
node src/cli/build.mjs /path/to/site
node src/cli/lint.mjs /path/to/site
```

Build validates component options; it does not run lint. Follow the
[pre-launch checklist](authoring.md#verify-before-launch) for browser and content checks.

## Work with coding agents

Developers and coding agents can follow the same loop: discover components in
[`llms.txt`](../llms.txt), read their linked contracts, compose a page, build, lint
and correct errors. Each component README documents allowed options and composition
boundaries. Validation errors name the invalid field, describe accepted values and
point to its README; [Authoring](authoring.md#correct-invalid-options) shows an example.

API tables come from the specifications used for validation. The documentation
build executes authored examples against the library. These checks verify defined
contracts; they do not guarantee that generated code meets a site's requirements.

## Explore the system

- **Components:** browse Layout, Atoms, Molecules and Organisms in the navigation.
  [Choosing molecules](molecules.md) compares the content tasks covered by the eight molecules.
  [Choose atoms](authoring.md#choose-atoms) compares primitives and integration paths.
  [Example context](authoring.md#component-example-context) explains imports and where snippets belong.
  For page regions, follow Hero → Section → Subsection → CTA for a landing page,
  or Page header → Legal document for support and policy content. The template adds
  Header and Footer from site configuration. [Authoring](authoring.md#compose-pages)
  shows both page compositions with imports and content data.
  [Architecture](architecture.md#component-layers) explains the hierarchy and ownership.
- **Configure a site:** [Site configuration](configuration.md), [Theming](theming.md)
  and [Naming conventions](conventions.md).
- **Check and extend:** [Rules](anti-patterns.md) and [Adding a component](adding-a-component.md).
- **Foundations:** start with [Layout](foundations/layout.md) for composition,
  [Color](foundations/color.md) for color roles, [Typography](foundations/type.md)
  and [Space, radius and motion](foundations/space.md) for shared scales.
  [Brand assets](foundations/brand.md), [Icon set](foundations/icons.md) and
  [Language](foundations/language.md) cover site-supplied artwork and strings.
  [Markup helpers](foundations/markup.md) are for blocks that need their own renderer.

Examples use fictional content; feature claims and prices are illustrative.
