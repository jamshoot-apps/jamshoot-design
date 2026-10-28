# Steps

<!-- docs-review: 52eb567811ec; reason: Its prose option carries inline markup now; the generated table states it. -->

A numbered process. Numbers come from source order, so inserting a step renumbers the
rest.

## Usage

```example title="A short workflow"
steps({ items: [
  { title: 'Create', body: 'Start a project and give it a name.' },
  { title: 'Organize', body: 'Add tasks and group them by topic.' },
  { title: 'Export', body: 'Save a copy of the completed project.' },
] })
```

```options steps
| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `items` | `non-empty array of { title, body }` | required | The steps, in order. Numbering is automatic. |
| `items[].title` | `string` | required | What this step is. |
| `items[].body` | `string (inline HTML allowed)` | required | What happens in it. May carry an inline link. |
```

## Composition

A step requires both `title` and `body`. For a list of short points without a
description under each one, use [Card's bullets option](../card/README.md) instead.
Card still requires a `title` for the whole list.

Place Steps in a [Section](../../organisms/section/README.md), or in a
[Subsection](../../organisms/subsection/README.md) when the process is one group among
several. Subsection demotes each step's heading along with the rest of its content.

For setup and the build/lint workflow, see [Authoring a site](https://jamshoot-apps.github.io/jamshoot-design/authoring.html).
For alternatives, see [Choosing molecules](https://jamshoot-apps.github.io/jamshoot-design/molecules.html).
