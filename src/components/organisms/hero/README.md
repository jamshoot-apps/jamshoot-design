# Hero

<!-- docs-review: c9ba1e85fe48; reason: Reviewed CSS comment spelling and figure placeholder in examples -->

The opening region of a landing page. Renders the page title and lead, with optional
actions, proof points and a visual supplied by a component or site block.

For a complete `pages.js` with imports and content data, see the
[landing-page composition](https://jamshoot-apps.github.io/jamshoot-design/authoring.html#compose-pages).

## Usage

This example uses a labeled placeholder for the visual. Replace it with an
image-backed [Figure](../../molecules/figure/README.md) or a
[site block](https://jamshoot-apps.github.io/jamshoot-design/authoring.html#site-blocks).

```example title="Hero with proof and visual"
hero({
  eyebrow: 'Project workspace',
  title: 'Keep your project notes and tasks together.',
  lead: 'Create a project, collect your notes and read the <a href="#guide">guide</a>.',
  actions: button({ label: 'Download', href: '#' }),
  proof: proof({ items: [{ term: 'Offline', value: 'No server request.' }] }),
  visual: figure({ placeholder: 'Product view' }),
})
```

```options hero
| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `title` | `string` | required | What the product does, as a sentence a customer would say. |
| `lead` | `string (inline HTML allowed)` | required | Supporting text under the title. Usually two or three sentences; inline links are allowed. |
| `eyebrow` | `string` | optional | A short audience or category label above the title. |
| `actions` | `component call, string, or array of them` | optional | Action content, usually one or two button() calls. Use the primary variant for the main action. |
| `proof` | `component call, string, or array of them` | optional | A proof() of checkable claims. |
| `visual` | `component call, string, or array of them` | optional | A figure() or site block. Hero controls placement; the supplied visual owns its internal layout. |
```

## Composition

The title renders as `h1`. Use Hero as the page heading on a landing page; use
[Page header](../pageHeader/README.md) for a support or policy page.

`lead` renders trusted inline HTML, including links and emphasis. Block elements are
refused. The title remains plain escaped text; markup options are not sanitizers.

The hero reserves a minimum visual height through `--ds-hero-visual-height` and does
not style the visual's internals. A site block owns its internal layout, assets and
any client behavior. Below 64 rem the regions stack with copy first.

The hero sits centered between the header and the first section: one
`--ds-section-space` above the copy, and no padding below, because the next
section's own padding is the gap. Only horizontal overflow is clipped, so a visual's
shadow may fall past the hero's bottom edge. A visual should center its own content
in the box it is given; one that sits high in it reads as a hero pushed up under the
header.
