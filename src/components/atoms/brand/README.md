# Brand

<!-- docs-review: 0dd7838e578b; reason: Clarified compact option wording and reviewed defaults, asset paths, naming constraints and Header ownership. -->

Combines an optional logo, visible name and tagline. It can be a link or a static
lockup.

For the template's Header, set `brand` in
[site configuration](https://jamshoot-apps.github.io/jamshoot-design/configuration.html). Call this atom when a
site-owned block needs another lockup.

## Usage

Import `brand` and `cluster` from `@jamshoot-apps/design` in the block. The logo below is
a documentation asset; use a site-owned asset path in your project. See
[example context](https://jamshoot-apps.github.io/jamshoot-design/authoring.html#component-example-context).

```example title="Text beside and below a logo, and the lockup a bar gets"
cluster({ gap: 'lg', content: [
  brand({ logo: 'brand/example.svg', text: 'Example', tagline: 'Project workspace' }),
  brand({ logo: 'brand/example.svg', text: 'Example', position: 'bottom', href: '#' }),
  brand({ logo: 'brand/example.svg', text: 'Example', tagline: 'Project workspace', compact: true, href: '#' }),
] })
```

```options brand
| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `logo` | `string` | optional | Path to the logo file. |
| `text` | `string` | optional | The name, shown beside the logo. |
| `tagline` | `string` | optional | A short subtitle shown below the name. |
| `label` | `string` | optional | The name for screen readers only, when the logo stands alone. |
| `position` | `"right" \| "bottom"` | default `right` | Where the text sits relative to the logo. |
| `compact` | `true or false` | default `false` | A compact lockup for control rows. Uses a smaller logo and hides the tagline below 52 rem. |
| `href` | `string` | optional | Where it links. Omit for a lockup that is not a link. |

Takes:

- at least one of `text` or `label` — a logo with no name is unreadable aloud
- `logo` whenever `label` is set — `label` names the logo, so with no logo it is read by nobody — use `text`
```

## Composition

Visible `text` makes the image decorative. Without visible text, `label` becomes the
image's accessible name and therefore requires `logo`. Intrinsic dimensions reserve
the square before the image loads; CSS controls its displayed size.

`compact` uses a smaller logo with rounded corners and hides the tagline below
52 rem. [Header](../../organisms/header/README.md) uses this option. It works with
`position: 'bottom'`, which changes the layout, not the size.

A block that needs a compact lockup uses the same option. The parent places Brand
through its own wrapper; see [component ownership](https://jamshoot-apps.github.io/jamshoot-design/architecture.html#component-layers).

## For library maintainers

Brand owns the compact styles; Header adds no brand styles. The repeated-declaration
check in `test/contracts/styles.test.mjs` catches copies of those declarations.
