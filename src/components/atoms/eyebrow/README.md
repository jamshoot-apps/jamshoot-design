# Eyebrow

<!-- docs-review: d198ca993249; reason: Initial local API, examples and composition reviewed. -->

The short line above a title that names the part of the page.

For [Hero](../../organisms/hero/README.md) or
[Section](../../organisms/section/README.md), set its `eyebrow` option. Use this atom
when composing a site block.

## Usage

Import `eyebrow` from `@jamshoot-apps/design` in the block; see
[example context](https://jamshoot-apps.github.io/jamshoot-design/authoring.html#component-example-context).

```example title="Section label"
eyebrow({ text: 'How it works' })
```

```options eyebrow
| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `text` | `string` | required | Two or three words. Not a sentence. |
```

## Composition

`hero()` and `section()` render an eyebrow when you set their `eyebrow` option.
