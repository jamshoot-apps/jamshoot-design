# Prose

<!-- docs-review: 1976cbfd1b85; reason: Documented that heading rhythm now reaches h4 after demotion. -->

Adds reading spacing to paragraphs, lists, headings and tables. Use
[Legal document](../../organisms/legalDocument/README.md) for policy and support
pages, or this atom inside a site-owned block that renders long-form markup.

## Usage

In the block, import the component and markup helper from their separate entry points:

```js
import { prose } from '@jamshoot-apps/design';
import { h } from '@jamshoot-apps/design/markup';
```

The expression below is the block's return value. See
[example context](https://jamshoot-apps.github.io/jamshoot-design/authoring.html#component-example-context) and
[site blocks](https://jamshoot-apps.github.io/jamshoot-design/authoring.html#add-site-specific-blocks) for the file structure.

```example title="Long-form copy"
prose({ content: [
  h('h2', { text: 'Data' }),
  h('p', { html: 'The app collects <strong>no personal data</strong>.' }),
  h('ul', {}, [h('li', { text: 'No account.' }), h('li', { text: 'No analytics.' })]),
] })
```

```options prose
| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `content` | `component call, string, or array of them` | required | Paragraphs, lists and tables, in reading order. |
```

## Composition

Pages use `legalDocument()` or import the site-owned block. Keep `h()` and the
`@jamshoot-apps/design/markup` import inside the block; pages do not write raw markup.

Headings are spaced down to `h4`, which is as deep as the outline goes once a
`subsection()` has demoted the prose it holds.
