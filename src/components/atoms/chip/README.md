# Chip

<!-- docs-review: 562bdd7076a9; reason: Initial local API, example and composition reviewed. -->

A short fact that stands on its own — "No account", "Works offline". It reads as
content in sentence case, on a raised fill, so it stays visible on a dark page and a
light one alike.

## Usage

Import `chip` and `cluster` from `@jamshoot-apps/design`; see
[example context](https://jamshoot-apps.github.io/jamshoot-design/authoring.html#component-example-context).

```example title="A row of facts"
cluster({ gap: 'xs', content: [
  chip({ label: 'No account' }),
  chip({ label: 'No analytics' }),
  chip({ label: 'Works offline' }),
] })
```

```options chip
| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `label` | `string` | required | Two to four words — "No account", "Works offline". |
```

## Composition

Use a chip for a fact and a [badge](../badge/README.md) for a status beside something
else. A badge is uppercase, outlined and small because it annotates; a chip is the
thing being said. Under a hero, [Proof](../../molecules/proof/README.md) with
`style: 'pills'` lays out a list of chips for you.
