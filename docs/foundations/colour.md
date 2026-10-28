# Colour

Use this page to choose a colour role. [Theming](../theming.md) explains how to assign
values, organise palette files and switch between them.

A role names a colour's purpose. The library defines twelve semantic interface
roles: four surfaces, three text roles, three accent roles and two borders.
Components reuse the same roles instead of defining a separate palette for each
component. Themes change the values while keeping their purpose. Twelve is the
interface contract, not a limit on all the colours a site can use; illustration
colours belong to the site.

The swatches below use the current theme. Switch palettes in the header to compare
them.

## Surfaces

Choose a surface by placement: `bg` for the page, `surface` for cards and panels,
`surface-raised` for elements above them, and `surface-sunken` for inset areas or
alternating bands. A theme may give two roles the same value: the light starter
palette uses white for both `surface` and `surface-raised`.

The ghost button uses `surface-raised` on hover and changes its border colour.
Changing that surface also changes the button's hover fill.

```example title="Surfaces"
h('div', { class: 'swatches' }, ['bg', 'surface', 'surface-raised', 'surface-sunken'].map((name) =>
  h('div', { class: 'swatch swatch--tall', style: `background: var(--ds-${name})` },
    h('code', { text: `--ds-${name}` }))))
```

## Text

Use `text` for a heading or key statement, `text-muted` for the description that
supports it, and `text-faint` for a caption or footnote. These roles give content
different emphasis; they do not set its size or weight. Each works on all four
surfaces with a minimum contrast of 4.5:1.

```example title="Text on every surface"
h('div', { class: 'swatches' }, ['bg', 'surface', 'surface-raised', 'surface-sunken'].map((surface) =>
  h('div', { class: 'swatch swatch--tall', style: `background: var(--ds-${surface})` }, [
    h('code', { text: surface }),
    h('p', { style: 'color: var(--ds-text)', text: 'text' }),
    h('p', { style: 'color: var(--ds-text-muted)', text: 'text-muted' }),
    h('p', { style: 'color: var(--ds-text-faint)', text: 'text-faint' }),
  ])))
```

## Accent

One accent gives emphasis and interaction a consistent colour across primary
buttons, accent links, the focus ring and text selection. Use `accent-strong` for
its hover and active step, and `on-accent` for text or icons on either accent fill.

Choose both accent values for use as foregrounds on surfaces and as fills behind
`on-accent`. Keep the accent for emphasis and interaction; it does not identify
error or success states.

```example title="Accent"
h('div', { class: 'swatches' }, [
  h('div', { class: 'swatch swatch--tall', style: 'background: var(--ds-accent); color: var(--ds-on-accent)' },
    h('code', { text: '--ds-accent' })),
  h('div', { class: 'swatch swatch--tall', style: 'background: var(--ds-accent-strong); color: var(--ds-on-accent)' },
    h('code', { text: '--ds-accent-strong' })),
])
```

## Borders

Use `border` for decorative dividers and card edges. Use `border-strong` for a
boundary that identifies a control. Surface colours alone need not contrast with
each other, so keep a visible boundary wherever it carries meaning.

```example title="Borders"
h('div', { class: 'swatches' }, ['border', 'border-strong'].map((name) =>
  h('div', { class: 'swatch swatch--tall', style: `border: 1px solid var(--ds-${name})` },
    h('code', { text: `--ds-${name}` }))))
```

## Roles together

The card selects `surface`, `border`, `text`, and `text-muted`. The primary button
selects `accent` and `on-accent`, changing its fill to `accent-strong` on hover.

```example title="Card and primary button"
stack({ gap: 'md', content: [
  card({ title: 'Your library', body: 'All notes in one place.' }),
  cluster({ content: button({ label: 'Open library', href: '#' }) }),
] })
```

## Allowed pairs

Lint checks 26 foreground/background pairs in every resolved palette, including
values inherited from the base theme:

| Foreground | Background | Minimum contrast |
| --- | --- | --- |
| `text`, `text-muted`, `text-faint` | Any of the four surfaces | 4.5:1 |
| `accent`, `accent-strong` | Any of the four surfaces | 4.5:1 |
| `on-accent` | `accent` or `accent-strong` | 4.5:1 |
| `border-strong` | Any of the four surfaces | 3:1 |
| `border` | A surface | Not checked; decorative use only |

Translucent foregrounds are composited onto their background before measurement;
the backgrounds in checked pairs must be opaque.

Other combinations, including ordinary text roles on accent fills and text over
photographs, gradients or illustration colours, need a separate contrast check
against the background actually shown. See the
[`contrast` rule](../anti-patterns.md#contrast-unreadable-text-and-boundaries-that-are-not-there)
and [WCAG non-text contrast](https://www.w3.org/WAI/WCAG22/understanding/non-text-contrast.html).

## Site illustration colours

Keep illustration colours in site-prefixed tokens used by site blocks, such as
a site's `--project-*` illustration colours. Shared components use the twelve library
roles. Add a shared role when a component needs a distinct meaning that the existing
roles do not express; define its usage and contrast pairs together. See
[Extending the system](../theming.md#extending-the-system) for where to add it.

## Colour values and validation

Rerun lint after changing a palette to check its resolved foreground/background
pairs. Build and lint are separate steps; see
[Authoring](../authoring.md#build-and-lint). Supported colour formats and palette
validation are in [Theming](../theming.md#two-rules-the-lint-enforces).
