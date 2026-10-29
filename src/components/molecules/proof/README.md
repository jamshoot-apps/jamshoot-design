# Proof

<!-- docs-review: 60dfc13271bf; reason: Reviewed rename of style to layout in spec, examples and table -->

Short factual claims for a hero. Use the default stacked layout for claims with
supporting text, or pills for terms that stand alone.

## Usage

```example title="Stacked and pill layouts"
stack({ content: [
  proof({ items: [{ term: 'Offline', value: 'No server request is made.' }] }),
  proof({ layout: 'pills', items: [{ term: 'No account' }, { term: 'No analytics' }] }),
] })
```

```options proof
| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `items` | `non-empty array of { term, value }` | required | The claims. Around three is a content guideline, not a checked limit. |
| `items[].term` | `string` | required | The claim, in three or four words. |
| `items[].value` | `string (inline HTML allowed)` | optional | The sentence that makes it checkable. May carry an inline link. |
| `layout` | `"stacked" \| "pills"` | default `stacked` | `pills` drops the expansion line and shows each term as a chip(). |
```

## Composition

Pass Proof to [Hero's proof slot](../../organisms/hero/README.md). Keep each claim
checkable; supporting text can include an inline link. A long list belongs in a
feature [Section](../../organisms/section/README.md).

Use `pills` only when the terms stand alone: this layout ignores `value` and draws
each term as a [Chip](../../atoms/chip/README.md). Pills render as a list; the default
stacked layout uses a `<dl>`.

For setup and the build/lint workflow, see [Authoring a site](https://jamshoot-apps.github.io/jamshoot-design/authoring.html).
For alternatives, see [Choosing molecules](https://jamshoot-apps.github.io/jamshoot-design/molecules.html).
