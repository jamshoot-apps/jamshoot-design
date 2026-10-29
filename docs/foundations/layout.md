# Layout

Layout components control content width and the space between components.
Spacing belongs to the parent that arranges children. A heading does not carry a
bottom margin, and a card does not decide its gap from the next card.

## Choose an arrangement

| You need to… | Use |
| --- | --- |
| Limit content width and add page gutters | [`container()`](../../src/components/layout/container/README.md) |
| Separate children vertically | [`stack()`](../../src/components/layout/stack/README.md) |
| Place actions or tags in a row that wraps | [`cluster()`](../../src/components/layout/cluster/README.md) |
| Arrange cells in columns that fit the available width | [`grid()`](../../src/components/layout/grid/README.md) |
| Pair two regions, then stack them on a narrow viewport | [`split()`](../../src/components/layout/split/README.md) |

Follow each component reference for supported options. For a complete page, see
[Authoring](../authoring.md#compose-pages). A page band such as
[`section()`](../../src/components/organisms/section/README.md) already includes a
container. Use `container()` when a site block needs its own page-width boundary.

## Compose a section

The section places its heading before the content and its actions below it. It
provides the container and spacing around those regions. The grid arranges the
cards; the cluster arranges the buttons.

```example title="A section with cards and actions"
section({
  id: 'layout-resources',
  title: 'Project resources',
  content: grid({ content: [
    card({ title: 'Guides', body: 'Read the project guides.' }),
    card({ title: 'Examples', body: 'Explore component compositions.' }),
    card({ title: 'Reference', body: 'Check the available options.' }),
  ] }),
  actions: cluster({ content: [
    button({ label: 'Home', href: 'index.html' }),
    button({ label: 'Resources', href: '#layout-resources', variant: 'ghost' }),
  ] }),
})
```

## Examples

The parent in each example owns the spacing. Resize the page to see the row wrap,
the grid change its column count and the split stack its regions.

```example title="Container and stack: a reading column"
container({ width: 'narrow', content: stack({ gap: 'md', content: [
  eyebrow({ text: 'Reading column' }),
  note({ body: 'The container limits the width. The stack spaces these children.' }),
] }) })
```

```example title="Cluster: a wrapping row"
cluster({ content: ['Design', 'Development', 'Documentation', 'Accessibility'].map((label) =>
  badge({ label })) })
```

```example title="Grid: columns follow the available width"
grid({ content: [
  card({ title: 'First', body: 'Each card is a grid cell.' }),
  card({ title: 'Second', body: 'The grid owns the gap between cards.' }),
  card({ title: 'Third', body: 'Columns collapse when there is less room.' }),
] })
```

```example title="Split: two regions in reading order"
split({
  start: note({ body: 'The first region stays first on a narrow screen.' }),
  end: note({ body: 'The second region moves below it.' }),
})
```

## Measures

`gap` values select steps from the spacing scale. Grid's `cell` option selects a
minimum column width from the measure scale; it does not set a column count.

See [Space, radius and motion](space.md) for spacing and layout values, and
[Theming](../theming.md#component-tokens) for the layout component tokens a site may change.
The allowed breakpoint values live in [`src/tokens/contract.js`](../../src/tokens/contract.js);
see the [breakpoint rule](../anti-patterns.md#breakpoint-a-fourth-breakpoint).

## Adding an arrangement

A repeated arrangement shared by sites is a layout component. A shape used by one
site belongs in that site's `blocks/`. Pages never assemble layout by typing `ds-*`
classes. See [site blocks](../authoring.md#site-blocks) for local
compositions and [Adding a component](../adding-a-component.md) for shared ones.
