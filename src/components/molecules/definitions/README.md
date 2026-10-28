# Definitions

<!-- docs-review: eb71c84fdca6; reason: Initial local API, examples and composition reviewed. -->

Term-and-value rows for requirements, short specifications and other compact facts.

## Usage

```example title="Requirements"
definitions({ items: [
  { term: 'Devices', value: 'Phone, tablet and desktop' },
  { term: 'Network', value: '<strong>Not required</strong>' },
] })
```

```options definitions
| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `items` | `non-empty array of { term, value }` | required | The rows. |
| `items[].term` | `string` | required | What is being specified. |
| `items[].value` | `string (inline HTML allowed)` | required | The value. May carry an inline link. |
```

## Composition

Use [Table](../table/README.md) when several rows share the same columns. Definitions
keeps one term paired with one value; below 34 rem each term stacks above its value.

For setup and the build/lint workflow, see [Authoring a site](https://jamshoot-apps.github.io/jamshoot-design/authoring.html).
For alternatives, see [Choosing molecules](https://jamshoot-apps.github.io/jamshoot-design/molecules.html).
