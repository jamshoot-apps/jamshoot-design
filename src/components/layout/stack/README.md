# Stack

<!-- docs-review: 6d13e3bf22f6; reason: Reviewed unchanged options and examples after moving token imports and declared runtime to src; guide links now work outside the checkout. -->

Places children vertically with the same gap between each pair. Use it when the
parent should control spacing between independent components.

## Usage

```example title="Space two components"
stack({ gap: 'md', content: [
  eyebrow({ text: 'Project notes' }),
  note({ body: 'Keep the context beside the next task.' }),
] })
```

```example title="Spacing scale"
h('div', {}, ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'].map((gap) =>
  stack({ gap, content: [eyebrow({ text: gap }), note({ body: 'Two children.' })] })))
```

```options stack
| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `content` | `component call, string, or array of them` | required | The children, in order. |
| `gap` | `"2xs" \| "xs" \| "sm" \| "md" \| "lg" \| "xl" \| "2xl"` | default `sm` | A step on the spacing scale. |
```

## Composition

The parent chooses the gap. Do not add compensating margins to children placed in a
stack.

Use [`cluster()`](../cluster/README.md) for a wrapping row, or
[`split()`](../split/README.md) for two regions that sit side by side on a wide
viewport. See the [Layout overview](https://jamshoot-apps.github.io/jamshoot-design/foundations-layout.html) for a
composition inside a section.
