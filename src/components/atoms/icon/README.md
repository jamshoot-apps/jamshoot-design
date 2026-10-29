# Icon

<!-- docs-review: 0c3a82df2d7a; reason: Reviewed American spelling in summaries; name option unchanged -->

Inlines an SVG at build time. Color follows `currentColor`; size follows
`--ds-icon-size`.

## Usage

These icons are built in; this example needs no `JAMSHOOT_ICONS_DIR` setting.
Import `icon` and `cluster` from `@jamshoot-apps/design`; see
[example context](https://jamshoot-apps.github.io/jamshoot-design/authoring.html#component-example-context).

```example title="Decorative and labeled icons"
cluster({ content: [
  icon({ name: 'arrow-forward' }),
  icon({ name: 'checkmark', label: 'Complete' }),
] })
```

```options icon
| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `name` | `icon name` | required | A built-in icon name or an SVG filename without .svg in JAMSHOOT_ICONS_DIR. |
| `label` | `string` | optional | Say what the icon means when it is the only thing carrying that meaning. Otherwise leave it out and it is hidden from screen readers. |
```

## Composition

Leave `label` out when nearby text already carries the meaning; the SVG is then hidden
from assistive technology. A standalone meaningful icon needs a label. Icon names are
SVG filenames without `.svg`: the built-in icons, plus those in the trusted directory
named by `JAMSHOOT_ICONS_DIR`; see the [icon guide](https://jamshoot-apps.github.io/jamshoot-design/foundations-icons.html).

Use [Icon tile](../iconTile/README.md) for a decorative feature marker on a raised
square. When a component offers an `icon` option, use that option for its owned layout.

## For library maintainers

`icon()` and the internal `inlineIcon()` helper emit the same SVG root. Its size is a
shared base rule, so this component declares `styles: false` and has no empty local
stylesheet.
