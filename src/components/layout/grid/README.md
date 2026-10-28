# Grid

<!-- docs-review: 1a72de9c190f; reason: Reviewed unchanged options and examples after moving token imports and declared runtime to src; guide links now work outside the checkout. -->

Lays out cells in as many columns as the available width allows.

## Usage

```example title="Narrow and wide cells"
stack({ gap: 'lg', content: ['xs', 'md'].map((cell) =>
  stack({ content: [
    eyebrow({ text: `cell: ${cell}` }),
    grid({ cell, content: ['Guides', 'Examples', 'Reference', 'Updates'].map((title) =>
      card({ title, body: 'The same content in both grids.' })) }),
  ] })) })
```

Resize the page to compare the two minimum cell widths. Both grids use the same gap;
at some widths they will have the same column count.

```example title="A larger gap between cells"
grid({ gap: 'lg', content: [
  card({ title: 'Guides', body: 'Read the project guides.' }),
  card({ title: 'Examples', body: 'Explore component compositions.' }),
] })
```

```options grid
| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `content` | `component call, string, or array of them` | required | The cells. Usually a list of card() calls. |
| `cell` | `"xs" \| "md"` | default `xs` | How narrow a cell may get before the grid drops a column. `md` suits cards with media. |
| `gap` | `"md" \| "lg"` | default `md` | A step on the spacing scale. |
```

## Composition

`cell` selects the minimum column width: `xs` uses `--ds-measure-xs` (16rem),
and `md` uses `--ds-measure-md` (20rem). Cells can grow wider, and a cell can shrink
below that minimum when its container is narrower. The column count follows the
available width. A caller sets neither a count nor a breakpoint.

If the site sets `--ds-grid-min`, that token overrides the minimum for both `cell`
values. See [Theming](https://jamshoot-apps.github.io/jamshoot-design/theming.html#component-tokens) for accepted
values and where to set it.

Use [`cluster()`](../cluster/README.md) for short items in a wrapping row, or
[`split()`](../split/README.md) for exactly two regions with a fixed viewport
breakpoint. See the [Layout overview](https://jamshoot-apps.github.io/jamshoot-design/foundations-layout.html) for a
grid inside a section.
