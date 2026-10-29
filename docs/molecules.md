# Choosing molecules

Molecules are components for a specific content task: a card, a process, a pricing
tier or a set of facts. Choose by the structure of your content, then read the linked
contract for required fields, defaults and examples.

## Choose by task

| Your content | Component |
| --- | --- |
| A title with text or bullets in a bordered panel | [Card](../src/components/molecules/card/README.md) |
| A framed product image or labeled placeholder | [Figure](../src/components/molecules/figure/README.md) |
| Requirements or specifications as term-and-value pairs | [Definitions](../src/components/molecules/definitions/README.md) |
| Data compared across shared columns | [Table](../src/components/molecules/table/README.md) |
| An ordered process with a description for each step | [Steps](../src/components/molecules/steps/README.md) |
| Questions with expandable answers | [FAQ](../src/components/molecules/faq/README.md) |
| A pricing tier with a price and features | [Plan](../src/components/molecules/plan/README.md) |
| Short factual claims for a hero | [Proof](../src/components/molecules/proof/README.md) |

For requirements such as “Network: Not required”, use Definitions. For a short list
inside a panel, use Card's `bullets`. For a comparison such as formats available in
each plan, use Table. Proof is for short claims supporting the hero.

## Compose a figure in a card

The [Card media recipe](../src/components/molecules/card/README.md#add-a-figure-through-media)
defines a site block that passes Figure's output through Card's media slot. The
result looks like this; the placeholder needs no image asset:

```example title="Card with a figure"
card({
  title: 'Project viewer',
  body: 'Review the project before exporting it.',
  media: figure({ placeholder: 'Screenshot pending', caption: 'Project overview' }),
})
```

## Compose and check

Set up a site with Node.js 22+ using [Authoring a site](authoring.md#set-up). The
guide describes package and source installation and a complete
minimal site. Import public functions from `@jamshoot-apps/design` in `pages.js` or site
blocks, and keep authored content in `content/`.

Arrange cards and plans with [Grid](../src/components/layout/grid/README.md).
Put a process, FAQ or set of facts in a [Section](../src/components/organisms/section/README.md);
use [Subsection](../src/components/organisms/subsection/README.md) for groups within it.
For an image in a card, follow the [Card media recipe](../src/components/molecules/card/README.md#add-a-figure-through-media).
Library implementations follow the [component dependency rules](architecture.md#component-layers);
a site block can compose molecules by passing their rendered output through a slot.

The API tables distinguish escaped strings, strings allowing inline HTML, and
renderable content such as Card's `media`. Inline HTML is for trusted authored text
and is not sanitized. Write or review that HTML yourself before adding it to
`content/`; validation checks its shape, not whether it is safe. It cannot contain
structural elements such as paragraphs, lists or tables. A different content
structure belongs in a site block.

List inputs must be non-empty. Omit an optional list when it has no content; if a
required list is empty, omit that component in the calling page or block.

From the library checkout, build the prepared site and then lint its current output:

```sh
node src/cli/build.mjs /path/to/site
node src/cli/lint.mjs /path/to/site
```

From a site directory, use the package paths shown in
[Authoring](authoring.md#compose-pages). Build validates component options; lint is a
separate check. Read the named field and linked README when correcting a
[validation error](authoring.md#correct-invalid-options), rebuild, and rerun lint.
Finish with the [pre-launch checklist](authoring.md#verify-before-launch) for browser,
keyboard and content checks.
