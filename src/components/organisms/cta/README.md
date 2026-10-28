# CTA

<!-- docs-review: c3e2f4b7c51d; reason: Reviewed Organisms composition, heading roles and examples; clarified recommendations and removed unsupported list and numbering claims. -->

An action band for the end of a page or between sections. Renders a title with
optional supporting text, actions and a note. See the
[landing-page composition](https://jamshoot-apps.github.io/jamshoot-design/authoring.html#compose-pages) for placement
after a section and the imports used in `pages.js`.

## Usage

```example title="Closing action"
cta({
  title: 'Start your next project.',
  lead: 'Add a note and choose your first task.',
  actions: button({ label: 'Download', href: '#' }),
  note: 'Questions: <a href="mailto:hello@example.com">hello@example.com</a>',
})
```

```example title="A band in the middle of the page"
cta({
  eyebrow: 'Export',
  title: 'Save a copy of your work.',
  lead: 'Export notes and tasks from the project menu.',
  actions: button({ label: 'Read the guide', href: '#', variant: 'ghost' }),
})
```

```options cta
| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `title` | `string` | required | The action heading. Keep it short. |
| `lead` | `string (inline HTML allowed)` | optional | Supporting text under the heading, usually one sentence. Inline links are allowed. |
| `eyebrow` | `string` | optional | A short audience or section label, useful for a band between sections. |
| `actions` | `component call, string, or array of them` | optional | Usually the same button() as the hero. |
| `note` | `string (inline HTML allowed)` | optional | A quiet line under the button — a contact address, a caveat. |
```

## Composition

The title renders as `h2`, below the page's `h1`.

`actions` usually receives the same `button()` used in the hero. If that button has
no destination yet, the CTA still renders its title and note without a dead link.

Use `eyebrow` when a band between sections needs a category label. A closing band
usually needs no label. This is a copy recommendation; the option is accepted in
either position.
