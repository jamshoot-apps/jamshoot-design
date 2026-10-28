# Visually hidden

<!-- docs-review: 3af36458f3f8; reason: Rule moved to src/styles/base.css as a shared utility; the component API is unchanged. -->

Keeps a text label in the accessibility tree without drawing it.

## Usage

This is a site-block expression. Import `visuallyHidden` from `@jamshoot-apps/design`
and `h` from `@jamshoot-apps/design/markup`; see
[example context](https://jamshoot-apps.github.io/jamshoot-design/authoring.html#component-example-context).

```example title="A spoken unit"
h('p', {}, [h('strong', { text: '36' }), visuallyHidden({ text: ' items per project' })])
```

```options visuallyHidden
| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `text` | `string` | required | What is read aloud. |
```

## Composition

Prefer visible text when it fits. Do not use this component to hide interactive
content.

## For library maintainers

The clipping is `.ds-visually-hidden` in `src/styles/base.css` rather than a local stylesheet,
so this component declares `styles: false`. Library controls that clip their own state
text use that class directly, because an atom may not import another atom. `.ds-icon`
lives in `src/styles/base.css` for the same reason.
