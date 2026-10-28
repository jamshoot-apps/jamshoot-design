# Naming conventions

Every component takes one options object. Use this page to choose its option names,
types and validation rules. The same name means the same thing in every component,
so once you know `body` in `note()`, you know `body` in `steps()`.

Read it when you add an option to a component, or call a component you have not used
before.

`test/contracts/naming.test.mjs` checks two things: each option name has one type
across all components, and the shared names below have the type this page gives them.
The option types and constraints below are enforced by the component contract.
The remaining naming guidance includes conventions the test cannot check.

## Shared names

| Name | What it holds | Type |
| --- | --- | --- |
| `title` | A heading. The component renders it as one. | `text` |
| `label` | The name of a control or a marker, drawn or not. | `text` |
| `text` | Plain words. Escaped, never markup. | `text` |
| `body`, `lead`, `note`, `answer`, `value` | Prose, named by its role. May contain an inline link or emphasis. | `markup` |
| `content` | Anything renderable: component calls, strings, lists of them. | `content` |

`text` is escaped: a `<` in it prints as `<`, so it cannot carry a link and cannot
inject markup. The prose names are not escaped, so a sentence in a content file can
contain its `<a>` or `<em>`. That is why `eyebrow({ text })` cannot take a link and
`note({ body })` can.

`label` names a control or marker. On a button it supplies the visible text; on an
icon-only control it supplies the accessible name. On a badge or chip it is the
marker's visible text.

## Option types and constraints

Declare each option's `type` in the component spec. Use `required: true` when
omission makes the component meaningless, and `default` for an intentional default.
An enum declares its accepted `values` beside the option. A boolean needs no central
registration.

The table is generated from the supported component types:

```types component
| Type | What it takes |
| --- | --- |
| `icon` | An icon name: a built-in icon or an SVG in the `JAMSHOOT_ICONS_DIR` directory. |
| `text` | Plain words. Escaped on the way out, so it can never carry markup. |
| `markup` | Words that carry an inline link or emphasis. Not escaped. |
| `url` | A destination, or null while it does not exist yet. Refuses whitespace and executable schemes. |
| `id` | An anchor target, so the thing can be linked to directly. |
| `content` | Another component call, a string, or a list of them. |
| `items` | A non-empty list of rows. `of` declares one row’s shape, checked field by field. |
| `shape` | One nested object. `of` declares it, checked field by field. |
| `lines` | A non-empty list of strings — bullet points, feature lines. Escaped. |
| `markupLines` | A non-empty list of strings, unescaped — the paragraphs of a policy. |
| `markupRows` | A non-empty list of non-empty table rows. A cell may carry inline markup. |
| `boolean` | Itself. `false` is an answer, not an omission. |
| `number` | Itself, and finite. |
| `enum` | One of a fixed set, declared in `values`. The set is printed in the error. |
```

Nested `items` and `shape` fields declare `of`; the generated README table prints
those fields recursively.

Rules across options are `constraints`, using `atMostOne`, `atLeastOne`,
`together`, `requiredWith` or a focused `constraint()`. Their descriptions are
generated into the README with the option table and remain the same rules the build
enforces. Use [Markup helpers](foundations/markup.md) for text escaping and the
boundary between inline markup and structured content.

For a complete component example and the required checks, follow
[Adding a component](adding-a-component.md).

## Lists

A general list of objects uses `items`. Existing role-specific names include
`themeToggle.choices`, `footer.groups` and `legalDocument.sections`. The fields of
one row depend on the markup the row becomes:

| Markup | Fields | Components |
| --- | --- | --- |
| A `dl` row | `term`, `value` | `definitions`, `proof` |
| A titled block | `title`, `body` | `steps` |
| A `details` | `question`, `answer` | `faq` |

`legalDocument.sections` takes an optional `title` and `id`, with content in
`paragraphs`, `list`, `table` or `outro`. See its component README for the full shape.

A list of plain strings is never `items`. It is named for what the strings are:
`bullets`, `features`, `columns`, `paragraphs`.

## Exceptions

`site.config.js` has its own names and is checked separately. There `name` is the
product name; in `icon()` it is the icon name. The test compares the components with
each other and the config with itself, never one with the other.

If two component options need the same name with different types, the pair and the
reason go into `REVIEWED` in the test. There is one today: `width` is a number in
`figure()`, where it is the `<img>` attribute, and an enum where it picks a page width.

## Scale steps

An option that picks a step on a scale takes the step's name: `gap: 'lg'`,
`cell: 'md'`. Each component accepts only the steps that make sense for it — `cluster()`
has no `3xs`, a grid has no `xl` — so a step that works in `stack()` can fail the build
in `cluster()`. The build error prints the allowed steps, and the component's API table
lists them.

`spaceSteps()` and `measureSteps()` check each subset against the scale at import
time. If a scale step is renamed, the build fails instead of an option silently
pointing at a token that no longer exists.

## Booleans

A boolean is named for the state it switches on: `featured`, `priority`, `compact`,
`toggle`. `false` is a valid value, so an option that defaults to `true` can be
switched off.

## Adding a name

Take the name from this page. If none fits, check whether the idea already exists
under another name — it usually does. If it is new and more than one component will
use it, add a row to the Shared names table and to `VOCABULARY` in `naming.test.mjs`, and
rename the option in every component that should use it. A name only one component
uses, like `subtitle` or `caption`, does not need a row.
