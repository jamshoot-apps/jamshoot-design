# Container

<!-- docs-review: b0cf159d977f; reason: Initial local API, examples and composition reviewed. -->

Limits content width and adds inline page gutters. A page band such as
[`section()`](../../organisms/section/README.md) already includes a container.
Use `container()` when a site block needs its own page-width boundary.

## Usage

```example title="Default and reading measures"
stack({ content: [
  container({ content: note({ body: 'The default measure suits wider page content.' }) }),
  container({ width: 'narrow', content: note({ body: 'The narrow measure suits a reading column.' }) }),
], gap: 'lg' })
```

Inside a full-width site block, combine a container with a layout for its children:

```example title="A reading column inside a site block"
container({ width: 'narrow', content: stack({ gap: 'md', content: [
  eyebrow({ text: 'Project notes' }),
  note({ body: 'The container limits width. The stack spaces the content.' }),
  note({ body: 'Put this composition in the site block that owns the region.' }),
] }) })
```

```options container
| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `content` | `component call, string, or array of them` | required | What sits inside the measure. |
| `width` | `"default" \| "narrow"` | default `default` | `narrow` is the reading measure, for legal and support pages. |
```

## Composition

The container owns width and inline gutter only. Use
[`stack()`](../stack/README.md), [`cluster()`](../cluster/README.md) or
[`grid()`](../grid/README.md) for spacing between children. Nesting a second
container adds another inline gutter; do not add one inside a section just to space
its content.

See the [Layout overview](https://jamshoot-apps.github.io/jamshoot-design/foundations-layout.html) for component
selection and [site blocks](https://jamshoot-apps.github.io/jamshoot-design/authoring.html#site-blocks)
for the block workflow.
