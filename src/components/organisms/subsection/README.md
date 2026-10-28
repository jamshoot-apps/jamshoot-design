# Subsection

<!-- docs-review: f2c61a7c5007; reason: No doc change: source comments rewritten to describe current behavior. -->

A titled group inside a [Section](../section/README.md). Its heading renders as
`h3`; headings in its content move down one level. See the complete
[landing-page composition](https://jamshoot-apps.github.io/jamshoot-design/authoring.html#compose-pages).

## Usage

Place each group in a Section's `content`. The complete page example linked above
shows that enclosing section; these previews show only the group itself.

```example title="Grouped questions"
subsection({
  id: 'storage',
  title: 'Storage',
  content: faq({ items: [{ question: 'Where are projects stored?', answer: 'In a folder on your device.' }] }),
})
```

```example title="A group of cards"
subsection({
  title: 'On the device',
  content: grid({ content: [
    card({ title: 'Offline', body: 'No account or network required.' }),
    card({ title: 'Local', body: 'Projects stay on your device.' }),
  ] }),
})
```

```options subsection
| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `title` | `string` | required | What this group is. |
| `content` | `component call, string, or array of them` | required | The group itself: cards, steps, an faq(), a table(). Whatever titles itself drops a level. |
| `id` | `string` | optional | An anchor, so the group can be linked to directly. |
```

## Composition

Anything goes in a group, including content that titles itself. The group's own
heading is an `h3` under the section's `h2`, and everything inside moves down one
level to sit beneath it: a card's title renders as `h4`, a question inside a nested
group as `h5`. The type does not change with the level — a card looks like a card
wherever it sits — so this is the document outline, not a second size scale.

Headings are demoted in the rendered markup, which is why no component carries a
`level` option: the nesting already says what the level is. A heading typed into a
text option is escaped and renders as plain text.
