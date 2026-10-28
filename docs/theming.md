# Theming

Use this page to assign values to colour roles, organise palette files and configure
theme switching. [Colour](foundations/colour.md) explains which role to choose and
which foreground/background pairs are checked.

A site sets colour and optional component tokens. The spacing rhythm, type scale,
motion and breakpoints remain library-owned. For a new site, copy a starter palette
to `theme.css`; for another palette, add a file in `themes/` with the values that
differ. Lint checks each resulting palette, including inherited values.

## The twelve colour roles

A site's base `theme.css` sets all twelve roles, plus `color-scheme: dark | light`
so native form controls and scrollbars follow. This table is generated from
`src/tokens/contract.js`, the contract used by lint.

```tokens roles
| Token | What it is | Checked at |
| --- | --- | --- |
| `--ds-bg` | The page itself. | — |
| `--ds-surface` | A card, a panel, anything sitting on the page. | — |
| `--ds-surface-raised` | A surface on top of a surface: an icon tile, an open menu. | — |
| `--ds-surface-sunken` | An alternating band, a code block, an empty frame. | — |
| `--ds-text` | Headings and key content. | 4.5:1 |
| `--ds-text-muted` | Body copy inside a component. | 4.5:1 |
| `--ds-text-faint` | Eyebrows, captions, footnotes. | 4.5:1 |
| `--ds-accent` | Primary actions, accent links and focus. | 4.5:1 |
| `--ds-accent-strong` | Its hover and active step. | 4.5:1 |
| `--ds-on-accent` | Text placed on either accent step. | 4.5:1 |
| `--ds-border` | Decorative dividers and card edges. | — |
| `--ds-border-strong` | Visible boundaries that identify controls. | 3:1 |
```

Start from `src/tokens/themes/dark.css` or `src/tokens/themes/light.css`, copy it to the site
as `theme.css`, and change the values.

```example title="Shared components in the current palette"
cluster({
  content: [
    button({ label: 'Download on the App Store', href: '#' }),
    button({ label: 'See how it works', href: '#', variant: 'ghost', icon: 'arrow-forward' }),
  ],
})
```

## More than one palette

Add another palette as a file in `themes/`:

```text
theme.css              the palette every reader starts from
themes/dark.css        what a dark system gets, and a state of the control
themes/warm-paper.css  a palette the reader can pick, and the system never will
```

The build discovers palettes from this directory; there is no list to update in
`site.config.js`. Each file contains one `:root` block with a `color-scheme` and
tokens. Lint rejects media queries and extra selectors because the build carries
only that block into the generated theme rules.

`light.css` and `dark.css` respond to the corresponding system preference. The base
palette covers the scheme it declares. Other filenames identify palettes available
through the theme control; the system does not select them.

### A palette writes what differs

The base sets all twelve roles. An additional palette sets only the roles it changes
and inherits the rest through the CSS cascade. This example starts from the light
starter palette:

```css
/* themes/warm-paper.css — three surface overrides. */
:root {
  color-scheme: light;
  --ds-theme-label: 'Warm paper';

  --ds-bg: #f5efe4;
  --ds-surface: #fbf7ef;
  --ds-surface-sunken: #f0e9de;
}
```

Lint resolves each palette against the base and measures the result. Here the nine
inherited roles, including text and accents, are checked against the changed
surfaces. All checked pairs still pass without foreground overrides.

### What the build writes

The build turns the files into selectors for system and reader choices:

```css
:root { … theme.css … }                                  /* the page */

@media (prefers-color-scheme: dark) {                    /* the system's answer */
  :root:not([data-theme]) { … themes/dark.css … }
}

:root[data-theme="dark"] { … themes/dark.css … }         /* the reader's answer */
:root[data-theme="warm-paper"] { … }
```

A reader who picks the base gets `data-theme="default"`. It stops the media query
from applying, leaving the base values in effect. With no attribute, the page follows
the operating system through CSS, including when JavaScript is unavailable.

### Metadata a palette carries

Two optional tokens set the palette's label and icon in the theme control. Both have
defaults, so an ordinary light/dark pair needs neither. This table is generated from
`src/tokens/contract.js`.

```tokens metadata
| Token | What it is | Defaults to |
| --- | --- | --- |
| `--ds-theme-label` | What the control calls this palette, and what a screen reader says. | The capitalised file name. |
| `--ds-theme-icon` | The icon the control shows while in that state. | The icon for its `color-scheme`. |
```

The icon must name a built-in icon or an SVG in the optional `JAMSHOOT_ICONS_DIR`
directory. Lint reports an unknown name against the palette file.

Keep this metadata in the palette file alongside its colour values.

## Letting the reader choose

CSS handles the system preference. To let readers choose a palette, enable the
header control and its runtime in `site.config.js`:

```js
theme: { toggle: true },
runtime: ['nav', 'theme'],
```

The control cycles through `auto` and then every palette, one click at a time, and its
accessible name gives the current state and the next one. `src/runtime/theme.js` writes the choice to
`data-theme` on `<html>` and remembers it; `auto` is the absence of a choice, so it is
the absence of both the attribute and the stored value. A short inline script in the
page head applies a stored choice before the first paint, so a reader who picked
light does not see a dark page flash on every navigation.

The runtime reads the states from the control's markup, so a palette added to
`themes/` appears in the cycle automatically. Enabling the control without the
`theme` runtime module, or with only one palette, fails the build.

## Extending the system

Four things a project might want to add, and where each one goes.

**Another palette.** Add a file in `themes/` with the values that differ from the base.

**Another colour role.** First check the
[role guidance](foundations/colour.md#site-illustration-colours). Add the role to
`ROLES` in `src/tokens/contract.js` and give it a base value in every site. Declare its
contrast backgrounds and minimum ratio in the same entry. The generated table and
lint checks read that contract; additional palettes may inherit the base value.

**Another component knob.** One entry in `COMPONENT_TOKENS`, and one `var(--ds-x, …)`
in the stylesheet that owns it — the same fallback the contract declares, which the
lint checks. See [Component tokens](#component-tokens) for what a knob is allowed to
be, and [Adding a component](adding-a-component.md) for the workflow.

**Project colours of your own.** A site's decorative colours go in the palette files
beside the roles, prefixed so they are obviously not part of the contract — and
because they live in a palette, they can differ per palette. Replace `project` in
this example with your site's prefix:

```css
/* theme.css */
--project-paper: #f4ece3;

/* themes/dark.css — the same motif, dimmed for a dark page. */
--project-paper: #2a2622;
```

Translucent pure black and pure white are shading, not colour, and can be written
inline: `rgb(0 0 0 / 0.33)` for a shadow is fine anywhere.

## Component tokens

Component tokens adjust specific settings, such as button corners or card padding.
Set them in `theme.css` or an additional palette; omitted tokens use the library
defaults shown below.

```tokens component
| Token | What it is | Accepts | Falls back to |
| --- | --- | --- | --- |
| `--ds-button-radius` | Corner of a button. Tighten it for a flatter brand. | zero or a `--ds-radius-*` token | `--ds-radius-pill` |
| `--ds-button-weight` | Label weight on a button. | a `--ds-weight-*` token | `--ds-weight-medium` |
| `--ds-card-radius` | Corner of a card. | zero or a `--ds-radius-*` token | `--ds-radius-md` |
| `--ds-card-padding` | Inset of a card. | a `--ds-space-*` token | `--ds-space-lg` |
| `--ds-card-surface` | Card fill, when it should not be the default surface. | `transparent` or a surface colour role | `--ds-surface` |
| `--ds-figure-radius` | Corner of a screenshot frame. | zero or a `--ds-radius-*` token | `--ds-radius-md` |
| `--ds-hero-visual-height` | How much room the hero reserves for the project’s own visual. Set it from the block that fills it. | a `--ds-measure-*` token or CSS length | `--ds-measure-md` |
| `--ds-grid-min` | Narrowest a grid column gets before the grid drops a column. | a `--ds-measure-*` token | `--ds-measure-xs` |
| `--ds-split-columns` | Column ratio of a two-up split. | two `fr` tracks, for example `2fr 1fr` | `1fr 1fr` |
```

Spacing between children is not on this list. That is the `gap` option on `stack()`,
`cluster()` and `grid()`, chosen per call from the fixed scale: a token for it would
have to win over every variant, which would quietly flatten the scale into one value.

## Two rules the lint enforces

**Palette values must be measurable.** Write the twelve roles as hex or numeric
`rgb()`/`rgba()` values, for example `#1b1b1f`, `rgb(27 27 31)` or
`rgb(255 255 255 / 0.08)`. Convert `hsl()`, `oklch()`, `var()` aliases and
`color-mix()` results to supported sRGB values before assigning them. Checked
backgrounds must be opaque; translucent foregrounds are composited onto them.

Lint checks every palette after resolving inheritance against the base. It rejects
missing roles, unknown library tokens, unsupported values and a `color-scheme`
other than `dark` or `light`. See [Allowed pairs](foundations/colour.md#allowed-pairs)
for the contrast thresholds and combinations that need a separate check.

**Component tokens belong to the site.** Library stylesheets read them with a
fallback and never assign them, so a site's value applies wherever the token is used.

Their values are part of the contract too: radii, weights, spacing and measures select a
token from their fixed scale; a card surface selects a surface role; the two structural
exceptions accept the CSS syntax stated in the table. Blocks may scope a component
token to one instance, but may not assign a private `--_*` variable.

For squarer buttons only in a dark palette, set `--ds-button-radius` in that file.
