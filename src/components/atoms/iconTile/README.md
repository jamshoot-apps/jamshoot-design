# Icon tile

<!-- docs-review: 3b814e1d067b; reason: Renamed the custom SVG directory variable to JAMSHOOT_ICONS_DIR without a compatibility alias. -->

Places a decorative icon on a raised square beside feature or step text.
It accepts built-in icons and SVGs from a trusted directory configured through
`JAMSHOOT_ICONS_DIR`; see the [icon guide](https://jamshoot-apps.github.io/jamshoot-design/foundations-icons.html).

## Usage

This icon is built in; this example needs no `JAMSHOOT_ICONS_DIR` setting.
Import `iconTile` from `@jamshoot-apps/design`; see
[example context](https://jamshoot-apps.github.io/jamshoot-design/authoring.html#component-example-context).

```example title="Feature marker"
iconTile({ name: 'checkmark' })
```

```options iconTile
| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `name` | `icon name` | required | A built-in icon name or an SVG filename without .svg in JAMSHOOT_ICONS_DIR. |
```

## Composition

The SVG is hidden from assistive technology. Keep its meaning in nearby visible
text. For a standalone meaningful icon, use [Icon](../icon/README.md) with `label`.

The tile owns its square, border and icon colour. A parent places the tile through its
own wrapper; it does not style `.ds-icon-tile` directly.
