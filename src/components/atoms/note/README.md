# Note

<!-- docs-review: 5720b45e97f0; reason: Renamed options to the shared vocabulary in docs/conventions.md; prose and examples updated. -->

A quiet caveat, footnote or contact line below stronger content.

## Usage

Import `note` from `@jamshoot-apps/design`; see
[example context](https://jamshoot-apps.github.io/jamshoot-design/authoring.html#component-example-context).
Replace the illustrative copy and link destination with your own.

```example title="Pricing note"
note({ body: 'One purchase, handled by the App Store. <a href="#terms">Terms apply</a>.' })
```

```options note
| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `body` | `string (inline HTML allowed)` | required | One sentence. May carry an inline link. |
```

## Composition

The option accepts inline markup and rejects block elements. Use one sentence; longer
copy belongs in [Legal document](../../organisms/legalDocument/README.md), or in
[Prose](../prose/README.md) inside a site-owned block.
