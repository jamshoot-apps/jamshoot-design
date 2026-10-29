# Button

<!-- docs-review: 9bc43228ff7b; reason: Reviewed CSS comment spelling and site block wording; contract unchanged -->

A navigation link styled as a primary or ghost action. It renders nothing when
`href` is omitted. Use a site-owned block for a submit button or a custom action.

## Usage

Import `button` and `cluster` from `@jamshoot-apps/design`; see
[example context](https://jamshoot-apps.github.io/jamshoot-design/authoring.html#component-example-context).
Replace the example destinations with your own links.

```example title="Both variants"
cluster({ content: [
  button({ label: 'Download', href: '#' }),
  button({ label: 'Learn more', href: '#details', variant: 'ghost', icon: 'arrow-forward' }),
] })
```

```options button
| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `label` | `string` | required | What the button says. |
| `href` | `string` | optional | Where it goes. Omit it and the button renders nothing, so a missing destination never shows as a dead link. |
| `variant` | `"primary" \| "ghost"` | default `primary` | Which of the two it is. |
| `icon` | `icon name` | optional | An icon name, shown after the label. |
```

## Composition

With no `href`, the component returns `null`; pre-launch pages do not show a dead
action. There is no arbitrary attribute pass-through. A new navigation behavior is a
component decision or belongs in a site block.

The icon sits in a button-owned wrapper. Button CSS does not select icon internals.
The `icon` option uses a built-in icon name or an SVG from the trusted directory
selected through `JAMSHOOT_ICONS_DIR`; see the [icon guide](https://jamshoot-apps.github.io/jamshoot-design/foundations-icons.html).
A text-only button needs no icon files.

A one-line button is `--ds-control-height` tall, never under `--ds-tap-target`. Something
that shares a row with buttons and has a fixed height of its own, such as a store badge,
is drawn at `--ds-control-height` so the row lines up.
