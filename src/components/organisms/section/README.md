# Section

<!-- docs-review: 45ad20eac28b; reason: Reviewed surface value plain renamed to default and example title -->

A page region with optional heading text, required content and optional actions.
Use it to group related content and give navigation links an anchor. See the
[landing-page composition](https://jamshoot-apps.github.io/jamshoot-design/authoring.html#compose-pages) for imports
and placement in `pages.js`.

## Usage

```example title="Default section"
section({ title: 'Questions', content: faq({ items: [{ question: 'Offline?', answer: 'Yes.' }] }) })
```

```example title="Sunken section with an action"
section({
  id: 'features',
  eyebrow: 'Features',
  title: 'Notes and tasks in one place.',
  lead: 'Each project keeps its own notes.',
  surface: 'sunken',
  content: card({ title: 'Local', body: 'Projects stay on the device.' }),
  actions: button({ label: 'Learn more', href: '#features', variant: 'ghost' }),
})
```

```options section
| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `content` | `component call, string, or array of them` | required | What the section is about — a grid, steps, an faq. |
| `id` | `string` | optional | An anchor, so the nav and in-page links can reach this band. |
| `eyebrow` | `string` | optional | The small line above the title that says which part of the page this is. |
| `title` | `string` | optional | What this part of the page is for, as a sentence. |
| `lead` | `string (inline HTML allowed)` | optional | Supporting text under the title, usually one or two sentences. |
| `surface` | `"default" \| "sunken"` | default `default` | Which surface role the band sits on. Alternate `sunken` down a long page so it has structure without a decorative divider. |
| `actions` | `component call, string, or array of them` | optional | A button() under the content, set off from it. The way on from a section that answered something. |
```

## Composition

Return sibling sections in an array from a page's `render` function; no raw-markup
import is needed. A section title renders as `h2`; use
[Subsection](../subsection/README.md) for titled groups below it. Start the page with
a [Hero](../hero/README.md) or [Page header](../pageHeader/README.md) for its `h1`.

With no `eyebrow`, `title` or `lead`, the empty head is hidden by component CSS. Put the
next action in `actions`; spacing above it belongs to the section, not the child.
