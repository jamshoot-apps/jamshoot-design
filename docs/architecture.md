# Architecture

JamShoot Design builds static sites using shared components. The library defines
their HTML, behavior, spacing and typography. Each site provides its own content,
colors and blocks. Node renders pages to HTML at build time, while runtime modules
and `blocks/*.client.js` handle browser interactions.

Library runtime belongs to shared component behavior: navigation, theme selection
and FAQ deep links. Site-specific illustration effects, including pointer parallax,
belong in that site's client blocks and are bundled automatically.

| Layer | What it provides |
| --- | --- |
| Design tokens | Named CSS values for spacing, typography, corners and motion. |
| Site theme | Color roles and allowed component tokens. |
| Components | Reusable UI built from those values. |
| Pages and blocks | Components arranged with each site's content and custom UI. |

## Shared visual rules

Every site uses the same design tokens: named CSS values for spacing, typography,
corners and motion. For example, `--ds-space-lg` sets a spacing value and
`--ds-radius-md` sets a corner radius. Components reuse these values across sites.

Sites set twelve color roles, such as background, text and accent. Components use
those roles, so a new palette changes their colors together. A small set of optional
component tokens adjusts details such as button corners without replacing component
styles. See [Theming](theming.md) for the allowed component tokens.

## Component layers

Pages are assembled from components at different levels:

| Layer | Examples | Purpose |
| --- | --- | --- |
| Layout | container, stack, cluster, grid, split | Arrange content and control the gaps. |
| Atoms | button, badge, icon | Small UI primitives. |
| Molecules | card, plan, faq, figure | Combine atoms into one unit. |
| Organisms | header, footer, hero, section | Combine components into a page region. |

Organisms can import molecules and atoms; molecules can import atoms. Components
cannot import others at the same or higher level.

Layout components are separate: molecules and organisms can import them, but atoms
and layout components cannot import other components.

Card and Figure are both molecules, so neither imports the other.
An organism or site block can combine them by passing Figure into Card's `media` option.

## Components stay independent

A component styles its own HTML. Its parent places it through a wrapper and never
selects its private elements. This lets a component change its internal markup
without making its parents' CSS depend on that change.

Spacing between components belongs to the layout that contains them. A card does
not add a margin for the next card; a grid sets the gap. Change the arrangement in
one place without editing the children. See [Layout](foundations/layout.md).

## Shared library, local blocks

A shared component change belongs in the library. Sites get that change when they
update the library and rebuild. A reusable variation becomes a component option,
so callers can choose it without copying HTML and CSS.

A shape needed by one site stays in its `blocks/`. Blocks compose public components
and add site-specific markup or behavior. Page text stays in `content/`, and
`pages.js` sets the component order. See [Authoring a site](authoring.md) for examples.

## One definition for validation and docs

Each component defines which options it accepts. The build checks these options,
and the documentation generates an API table from the same definition.

Use the [component catalog](../llms.txt) to find components and their options.
After composing a page, run the build and lint checks.

Build errors identify invalid component inputs. Lint checks styling and layout
rules; tests check component boundaries and documentation. These checks catch
specific mistakes, while browser review checks how the finished page looks and
behaves. See [Rules](anti-patterns.md) and [Testing](testing.md).

## Predictable CSS

The build groups source files into CSS layers, then writes one stylesheet.
Layers appear below in cascade order. Library paths are relative to the package;
`site/` means the site's directory.

```diagram css-assembly
```

The build puts site blocks after library styles in the CSS cascade. For normal
declarations, a later layer wins without needing more specific selectors. Blocks
can set [allowed component tokens](theming.md#component-tokens) on their wrappers;
private component elements stay under the component's control.

To extend the library, follow [Adding a component](adding-a-component.md) for the
folder structure, public export, examples and documentation checks.

## Source and distribution

All shipped implementation and resources live in `src/`: components, tokens, shared
styles, runtime modules, built-in icons and published command-line tools in `src/cli/`. Public
imports are mapped by `package.json.exports`; CLI commands are mapped by its `bin`
field. Repository tools in `scripts/`, full guides and artwork in `docs/`, and shared
checks in `test/` are excluded from npm. Component READMEs and `llms.txt` provide
offline API contracts; full-guide links point to public documentation.

The library ships native ESM and CSS directly, without a separate transpilation
output. Packaging tests install a real tarball offline into a separate fixture
site and exercise public imports, executable commands and packaged references.
