# Split

<!-- docs-review: 92d76ab5322c; reason: Clarified first and second regions; reviewed the unchanged renderer, 52rem transition, column token and complete README. -->

Stacks two regions vertically below a viewport width of 52rem. At 52rem and above,
it places them side by side. `start` remains first in source and reading order.

## Usage

```example title="Copy beside a visual"
split({
  start: note({ body: 'Copy remains first on a narrow screen.' }),
  end: figure({ label: 'Product view', caption: 'Product view' }),
})
```

```options split
| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `start` | `component call, string, or array of them` | required | The first region in source and reading order. |
| `end` | `component call, string, or array of them` | required | The second region. |
```

## Composition

Both regions are required. Use another component when one side is optional rather than
passing an empty placeholder.

The default column ratio is `1fr 1fr`. A site may change it with
`--ds-split-columns`; see [Theming](https://jamshoot-apps.github.io/jamshoot-design/theming.html#component-tokens) for
accepted values and where to set it. The breakpoint stays at 52rem.

Use [`stack()`](../stack/README.md) when regions should stay vertical, or
[`grid()`](../grid/README.md) when the number of columns should follow the available
width. See the [Layout overview](https://jamshoot-apps.github.io/jamshoot-design/foundations-layout.html) for the
selection guide.
