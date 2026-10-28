# Table

<!-- docs-review: e4acf5d851bc; reason: Documented the focusable scroll container and what a caption adds. -->

Data arranged in shared columns with a header row. Wide tables scroll inside their
container. Add a caption to name both the table and its scroll region.

## Usage

```example title="Data with shared columns"
table({
  caption: 'Project export formats',
  columns: ['Content', 'Format', 'Included?'],
  rows: [
    ['Notes', '<strong>Markdown</strong>', 'Yes'],
    ['Tasks', 'CSV', 'Yes'],
  ],
})
```

```options table
| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `columns` | `non-empty array of strings` | required | Column headings, left to right. |
| `rows` | `non-empty array of non-empty arrays of strings (inline HTML allowed)` | required | Rows of cells, each as long as `columns`. |
| `caption` | `string` | optional | What the table is about, drawn above it. It also names the scroll region, so a reader who tabs into it is told what they landed in. |

Takes:

- every row as long as `columns`
```

## Composition

Use [Definitions](../definitions/README.md) for compact term-and-value facts that do
not need shared columns.

Provide a `caption` to name the table and its focusable scroll region. Without one,
the component supplies neither a table caption nor a named region. A nearby sentence
can provide context, but this component does not programmatically associate it with
the table or scroll container.

The scroll container has `tabindex="0"` so keyboard users can reach and scroll it.
This adds one tab stop per table even when the data fits: static output does not
know the reader's viewport. Check keyboard scrolling and visible focus in the
finished page.

For setup and the build/lint workflow, see [Authoring a site](https://jamshoot-apps.github.io/jamshoot-design/authoring.html).
For alternatives, see [Choosing molecules](https://jamshoot-apps.github.io/jamshoot-design/molecules.html).
