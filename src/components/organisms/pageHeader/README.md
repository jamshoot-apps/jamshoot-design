# Page header

<!-- docs-review: e3e6a2723808; reason: Documented the stronger divider constrained to the content column for both widths. -->

The `h1` and optional metadata for a support or policy page. Use `narrow` with
[Legal document](../legalDocument/README.md) and `default` with full-width sections.
A double-hairline divider spans the content column, inside the container gutters.
See the complete [support-page composition](https://jamshoot-apps.github.io/jamshoot-design/authoring.html#compose-pages).

## Usage

These are alternative page headings. Choose one per page.

```example title="Narrow document heading"
pageHeader({ title: 'Privacy policy', meta: 'Updated 12 September 2026' })
```

```example title="Full-width support heading"
pageHeader({ title: 'Support', width: 'default' })
```

```options pageHeader
| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `title` | `string` | required | The page’s name. |
| `meta` | `string` | optional | Dates and version lines that belong to the document, not to the copy. |
| `width` | `"default" \| "narrow"` | default `narrow` | Match the page content: default for sections, narrow for documents. |
```

## Composition

The default `narrow` width matches `legalDocument()`. Use `default` when the page body
contains full-width sections such as an FAQ.

Use Page header or [Hero](../hero/README.md) for the page's `h1`. Section titles and
Legal document clause headings render as `h2` below it.
