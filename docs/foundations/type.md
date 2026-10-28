# Typography

The default typeface is the platform's system UI font. The library ships no font
files and makes no font requests by default. The mono role uses system monospace.

## A site's own face

A site may supply a font family for the `display`, `sans` and `mono` roles. The
library defines the shared size, weight, line-height and tracking scales.

| Role | Token | Draws |
| --- | --- | --- |
| `display` | `--ds-font-display` | `h1`–`h4`. Falls back to `sans` when a site leaves it out. |
| `sans` | `--ds-font-sans` | everything else |
| `mono` | `--ds-font-mono` | `code`, `kbd`, `samp` |

A site names the face in [`site.config.js`](../configuration.md#fonts) and keeps the
file in its own `assets/`. Add this field to the exported `site` object:

```js
fonts: {
  display: {
    family: 'Libre Baskerville',
    fallback: 'Georgia, serif',
    files: [{ weight: 700, path: 'assets/fonts/LibreBaskerville-700.woff2' }],
  },
},
```

The build writes the `@font-face` rules and points the role token at the family, so a
site never writes either by hand. A file has to be `.woff2`, at a weight on the scale
below, and exist — each is a build error rather than a page that quietly falls back.
Ship only the weights the role draws: headings are semibold, and a browser asked for
600 uses the nearest heavier file, so a display face with no 600 needs only its 700.

Keep custom font files and their required notices with the site. Do not edit the
library's primitives to configure a site's typography. The OG generator embeds the
configured site font files in its standalone preview; it uses the system stack when
no custom faces are configured.

## Scale

Display, title and subtitle scale with the viewport; body and below do not. Resize
this page and watch which lines move.

```example title="The whole scale"
h('div', {}, ['display', 'title', 'subtitle', 'body', 'small', 'caption', 'micro'].map((step) =>
  h('p', { style: `font-size: var(--ds-text-${step}); line-height: var(--ds-leading-snug)` },
    `${step} — Just one more small change before we ship.`)))
```

| Token | Size |
| --- | --- |
| `--ds-text-display` | `clamp(2.1rem, 1.5rem + 2.6vw, 3.5rem)` |
| `--ds-text-title` | `clamp(1.55rem, 1.3rem + 1.1vw, 2.25rem)` |
| `--ds-text-subtitle` | `clamp(1.1rem, 1.02rem + 0.4vw, 1.3rem)` |
| `--ds-text-body` | `1rem` |
| `--ds-text-small` | `0.9375rem` |
| `--ds-text-caption` | `0.8125rem` |
| `--ds-text-micro` | `0.6875rem` |

`h1` is display, `h2` is title, `h3` is subtitle. A heading never carries a margin, so
it can be reused anywhere — spacing belongs to the container.

Below that the scale stops and the outline carries on: a component titling itself
inside a `subsection()` renders an `h4` or lower, and keeps the size its own class
gives it. Depth is a fact about the document, not another type step.

## Weights

```example title="Weights"
h('div', {}, ['regular', 'medium', 'semibold', 'bold'].map((weight) =>
  h('p', { style: `font-weight: var(--ds-weight-${weight}); font-size: var(--ds-text-subtitle)` },
    `${weight} — Create a project and choose your next task.`)))
```

| Token | Weight |
| --- | --- |
| `--ds-weight-regular` | `400` |
| `--ds-weight-medium` | `500` |
| `--ds-weight-semibold` | `600` |
| `--ds-weight-bold` | `700` |

Shared headings use semibold. Bold emphasizes a word inside a sentence. Emphasis
is medium upright text: the system does not synthesize an italic face it does not ship.

## Line height and tracking

```example title="Leading"
h('div', { class: 'swatches' }, ['tight', 'snug', 'body'].map((step) =>
  h('div', { class: 'swatch', style: `line-height: var(--ds-leading-${step})` }, [
    h('code', { text: `--ds-leading-${step}` }),
    h('p', { text: 'Collect your notes, organize the next tasks and save a copy when the project is complete.' }),
  ])))
```

| Token | Line height |
| --- | --- |
| `--ds-leading-tight` | `1.1` |
| `--ds-leading-snug` | `1.35` |
| `--ds-leading-body` | `1.6` |

These unitless values multiply the element's font size.

`--ds-tracking-tight` (`-0.02em`) is used on headings. `--ds-tracking-wide` (`0.16em`)
is for small uppercase labels — eyebrows, badges and column titles. Site blocks use
these tracking tokens or `normal`; see the [`scale` rule](../anti-patterns.md#scale-a-size-that-is-not-on-a-scale).
