# Cluster

<!-- docs-review: 1cc3d9fa39e3; reason: Reviewed unchanged options and examples after moving token imports and declared runtime to src; guide links now work outside the checkout. -->

Places children in a row that wraps onto additional lines. Use it for actions,
tags and other short items.

## Usage

```example title="A wrapping row of actions"
cluster({ content: [
  button({ label: 'Home', href: 'index.html' }),
  button({ label: 'Layout overview', href: 'foundations-layout.html', variant: 'ghost' }),
] })
```

```example title="Gap and alignment choices"
stack({ content: [
  cluster({ gap: 'xs', content: [badge({ label: 'One' }), badge({ label: 'Two' })] }),
  cluster({ content: [badge({ label: 'Default' }), badge({ label: 'gap' })] }),
  cluster({ gap: 'lg', justify: 'between', content: [badge({ label: 'Start' }), badge({ label: 'End' })] }),
] })
```

```options cluster
| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `content` | `component call, string, or array of them` | required | The children, in order. |
| `gap` | `"xs" \| "sm" \| "lg"` | default `sm` | A step on the spacing scale. |
| `justify` | `"start" \| "between"` | default `start` | `between` pushes the first and last child to the edges. |
```

## Composition

Children stay in source order when wrapping. `between` is for two edge-aligned items,
not for distributing a long navigation list.

For a collection arranged in columns, use [`grid()`](../grid/README.md). See the
[Layout overview](https://jamshoot-apps.github.io/jamshoot-design/foundations-layout.html) for a section with cards
and actions.
