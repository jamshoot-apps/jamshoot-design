# Markup helpers

Use markup helpers when a site-owned block needs a renderer that existing
components cannot provide. Helpers preserve HTML safety and composition, but they
do not supply design decisions. Browse the [component catalog](../../llms.txt)
before writing a renderer.

Import helpers from `@jamshoot-apps/design/markup` inside the block. Pages and content
files compose components; `src/cli/lint.mjs` rejects this entry point there. See
[Authoring](../authoring.md#add-site-specific-blocks) for the block structure.

The examples on the foundations pages call `h()` to draw swatches and rulers. Their
documentation-specific markup is not a page composition example.

## Usage

### Elements and fragments

`h(tag, props, children)` builds one element. Put untrusted or user-facing copy in
`text`; it is escaped. `fragment(children)` joins sibling nodes when no wrapper is
semantically correct. Both return safe markup that nests without being escaped again.

```example title="Safe text and wrapper-free siblings"
fragment([
  h('h2', { text: 'Files & folders' }),
  h('p', { text: 'The literal <name> is shown safely.' }),
])
```

`null`, `undefined` and `false` children and attributes are omitted. Zero is rendered,
and empty attribute values such as `alt=""` are preserved. Use the omitted values
for optional markup rather than building HTML with string conditionals.

### The trust boundary

`escape(value)` returns escaped plain text. `raw(value)` marks a complete string as
trusted markup. Components normally make `raw()` unnecessary; use it only for markup
owned by the repository, never for form input, URL data, remote content or an
unescaped content value.

```js
const trusted = raw('<em>Checked at build time</em>');
const composed = raw(`<span>${escape(content.label)}</span>`);
```

When only a prop needs inline markup, prefer `h(tag, { html })` and keep the trusted
span as small as possible. Everything else belongs in `text`.

### Inline means inline

The options a component declares as markup — a `lead`, a `note`, a policy paragraph, a
table cell — take the `<a>`, `<em>` or `<strong>` a sentence carries, and nothing that
carries structure. A block element in one of them (`<h3>`, `<p>`, `<ul>`, `<div>`, a
`<table>`) fails the build, naming the tag.

Two reasons, and the second is the one that bites. It lands *inside* the element the
renderer already made — a `<p>` inside a `<p>` is not the markup anyone meant. And a
component reads the markup it was handed: `subsection()` moves every heading in its
content down a level, and it can only tell a renderer's heading from a hand-typed one
because the hand-typed one was escaped on the way in.

If a value needs structure, it is not a sentence: it is a `prose()` of components, or a
`content` option, or a missing component.
