# FAQ

<!-- docs-review: 89b5db1374e8; reason: Reviewed unchanged options and examples after moving token imports and declared runtime to src; guide links now work outside the checkout. -->

Expandable questions and answers built on native `<details>`. Readers can open
answers without JavaScript; add the `faq` runtime to open an answer when following
its anchor link.

## Usage

```example title="Questions"
faq({ items: [
  { id: 'final-version', question: 'Is this the final version?', answer: 'Yes. The filename says so.' },
  { question: 'How do I save a copy?', answer: 'Choose <strong>Export</strong> in the project menu.' },
] })
```

```options faq
| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `items` | `non-empty array of { question, answer, id }` | required | The questions, in the order someone would ask them. |
| `items[].question` | `string` | required | Asked the way a reader would ask it. |
| `items[].answer` | `string (inline HTML allowed)` | required | Answered in one or two sentences. May carry an inline link. |
| `items[].id` | `string` | optional | An anchor, so the answer can be linked to directly. |
```

## Composition

Place FAQ in a [Section](../../organisms/section/README.md), or group questions with
[Subsection](../../organisms/subsection/README.md). Answers accept trusted inline
markup such as links and emphasis; structural elements such as paragraphs and lists
are rejected. Use a site block for answers that need a different content structure.

Each question is an `h3` inside its `<summary>`. Subsection demotes these headings
along with the rest of its content. FAQ owns its chevron wrapper and animation;
parents place the component without selecting its private elements.

## Deep links

Give a question a page-unique `id`, such as `final-version` in the example above. Link to
it with `#final-version` on the same page or `support.html#final-version` from another page when
the FAQ is on `support.html`.

In `site.config.js`, add `'faq'` to the existing `site.runtime` array. Keep any other
modules the site uses; for a site using only navigation and FAQ, the field is:

```js
runtime: ['nav', 'faq'],
```

The runtime opens the matching answer on arrival and when the fragment changes.
Without it, a link to the question's `id` reaches the closed question and the reader
opens it. Adding an anchor alone does not open that `<details>` element.
See [browser runtime configuration](https://jamshoot-apps.github.io/jamshoot-design/configuration.html#browser-runtime).

For setup and the build/lint workflow, see [Authoring a site](https://jamshoot-apps.github.io/jamshoot-design/authoring.html).
For alternatives, see [Choosing molecules](https://jamshoot-apps.github.io/jamshoot-design/molecules.html).
