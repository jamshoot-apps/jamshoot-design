# Badge

<!-- docs-review: 57155ea01316; reason: Initial local API, examples and composition reviewed. -->

A short label beside another element. It is not a notification count or the only
place a status is stated.

## Usage

These are component expressions for an existing site. Import `badge` and `cluster`
from `@jamshoot-apps/design`; see [example context](https://jamshoot-apps.github.io/jamshoot-design/authoring.html#component-example-context).

```example title="Both tones"
cluster({ content: [
  badge({ label: 'One-time purchase' }),
  badge({ label: 'Most popular', tone: 'accent' }),
] })
```

```options badge
| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `label` | `string` | required | One or two words. |
| `tone` | `"plain" \| "accent"` | default `plain` | Accent marks the one that matters. |
```

## Composition

Use at most one accent badge in a comparison. Repeating it removes the distinction.
Use a [Chip](../chip/README.md) for a standalone fact.
