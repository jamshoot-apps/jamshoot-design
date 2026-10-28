# Legal document

<!-- docs-review: 0036c5f880b9; reason: Reviewed Organisms composition, heading roles and examples; clarified recommendations and removed unsupported list and numbering claims. -->

Renders support and policy content as ordered sections containing paragraphs,
bullet lists and tables. Sections may have headings and linkable anchors. See the
complete [support-page composition](https://jamshoot-apps.github.io/jamshoot-design/authoring.html#compose-pages)
for pairing it with [Page header](../pageHeader/README.md).

## Usage

```example title="Default and full-width documents"
stack({ content: [
  legalDocument({ sections: [{
    id: 'settings',
    title: 'Project settings',
    paragraphs: ['Review the <strong>project settings</strong> before starting.'],
    list: ['Check the selected language and theme.'],
    table: { columns: ['Item', 'Location'], rows: [['Settings', 'On device']] },
    outro: ['These instructions apply to the current release.'],
  }] }),
  legalDocument({ width: 'default', sections: [{ paragraphs: ['A full-width support note.'] }] }),
] })
```

```options legalDocument
| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `width` | `"default" \| "narrow"` | default `narrow` | Match the document to the page grid or use a narrow reading column. |
| `sections` | `non-empty array of { title, id, paragraphs, list, table, outro }` | required | The clauses, in order. Each is any mix of prose, a list and a table — which is what a policy is. |
| `sections[].title` | `string` | optional | Optional clause heading. Omit for plain paragraphs. |
| `sections[].id` | `string` | optional | An anchor. Without one the heading is not linkable. |
| `sections[].paragraphs` | `non-empty array of strings (inline HTML allowed)` | optional | The clause itself, one string per paragraph. Each may carry inline links. |
| `sections[].list` | `non-empty array of strings (inline HTML allowed)` | optional | Bullet points, after the paragraphs. |
| `sections[].table` | `{ columns, rows }` | optional | A table, after the list. |
| `sections[].table.columns` | `non-empty array of strings` | required | Column headings. |
| `sections[].table.rows` | `non-empty array of non-empty arrays of strings (inline HTML allowed)` | required | Rows of cells. |
| `sections[].outro` | `non-empty array of strings (inline HTML allowed)` | optional | Paragraphs after the table. |

Takes:

- a clause with something under its heading — `paragraphs`, `list`, `table` or `outro`
```

## Composition

Within each section, content renders in this order: `paragraphs`, `list`, `table`,
then `outro`. Supply at least one content field; a heading alone is rejected.

List items accept trusted inline HTML, not nested lists. Paragraphs, list items,
table cells and outro text are not sanitized. Plain text headings are escaped.
Clause headings render as `h2`; an `id` makes the heading a link to that clause.
The component adds no numbering. Use Page header for the document's `h1` and match
the two components' widths.

For styling ownership when composing components, see
[Architecture](https://jamshoot-apps.github.io/jamshoot-design/architecture.html#component-layers).
