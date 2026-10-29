# Adding a component

Add a shared component to the JamShoot Design library, with a validated option
contract, styles and a documentation page. This guide uses a `quote` component as
an example; choose the name and options that fit your component.

Work in the `jamshoot-design/` source checkout with Node.js 22 or later. All paths
and commands below are relative to that directory. This is library development;
for a site's pages and blocks, use [Authoring a site](authoring.md).

First [decide where the change belongs](#decide-where-the-change-belongs), then
follow these steps in order:

- [1. Declare and render it](#1-declare-and-render-it).
- [2. Style only owned markup](#2-style-only-owned-markup).
- [3. Write the local README](#3-write-the-local-readme).
- [4. Export it](#4-export-it).
- [5. Record the documentation review](#5-record-the-documentation-review).
- [6. Generate and check](#generate-and-check).

You will create one component folder and add one public export:

```
src/components/molecules/quote/
  quote.js       contract and renderer
  quote.css      styles, unless the spec declares styles: false
  README.md      executable examples, generated API table and composition notes
  quote.test.mjs optional focused behavior test
src/index.js     export { quote } from './components/molecules/quote/quote.js';
```

The contract test catches a missing or extra export in `src/index.js`.

## Decide where the change belongs

| If | Put it here |
| --- | --- |
| One site needs the markup | that site's `blocks/` |
| Two sites need the same UI and behavior | a design-system component |
| An existing component needs another meaningful state | a local option or variant |
| A site needs to tune one stable visual value | a rare component token |

Do not promote a page block for symmetry, and do not create a new component to rename
an existing variant.

Choose a folder based on what the component combines:

| Group | Directory | Scope |
| --- | --- | --- |
| Layout | `src/components/layout/` | arrangement and content width; separate from the atomic levels |
| Atoms | `src/components/atoms/` | a small UI primitive; imports no component |
| Molecules | `src/components/molecules/` | atoms combined into one purposeful unit |
| Organisms | `src/components/organisms/` | molecules combined into a complete page region |

Atomic dependencies point downward. Molecules may import atoms; organisms may import
atoms and molecules; layout may be used for arrangement without changing the atomic
level. Layout and atoms do not import components, and no tier imports itself or a
higher atomic tier. `npm test` checks this import graph.

The same boundary applies to content slots: combining Card and Figure, both
molecules, belongs in an organism or a site block. Document that composition where
it is defined. See [Component layers](architecture.md#component-layers).

## 1. Declare and render it

Create `src/components/molecules/quote/quote.js`. It exports one `defineComponent`
call. Keep the option contract and renderer
together; HTML is already produced by the renderer, so there is no template file.

```js
import { defineComponent } from '../../../define.js';
import { h } from '../../../html.js';

export const quote = defineComponent('quote', {
  summary: 'A short quotation with its source.',
  docs: 'src/components/molecules/quote/README.md',
  options: {
    text: { type: 'text', required: true, summary: 'What was said.' },
    who: { type: 'text', required: true, summary: 'Who said it.' },
  },
  render: ({ text, who }) => h('figure', { class: 'ds-quote' }, [
    h('blockquote', { class: 'ds-quote__text', text }),
    h('figcaption', { class: 'ds-quote__who', text: who }),
  ]),
});
```

The component name, folder, source file and public export name match. Every option has
a summary. Both options use the `text` type. See [Naming conventions](conventions.md)
for shared option names and [Option types and constraints](conventions.md#option-types-and-constraints)
for supported types and how to declare defaults and rules between options.

## 2. Style only owned markup

Create `src/components/molecules/quote/quote.css`, using classes emitted by the
renderer and the library's design tokens:

```css
.ds-quote {
  margin: 0;
}

.ds-quote__text {
  margin: 0;
  font-size: var(--ds-text-subtitle);
}

.ds-quote__who {
  margin-top: var(--ds-space-sm);
  color: var(--ds-text-muted);
}
```

The build discovers the stylesheet and wraps it in the group cascade layer. Do not
write `@layer` in the file. See [Rules](anti-patterns.md) for enforced styling rules.

A parent places a child through a parent-owned wrapper. It does not select the child's
root or `.ds-child__*` internals. If the child must alter its internals for a recurring
composition, prefer a small existing variant; otherwise add one narrow documented
attribute hook and keep the internal rule in the child's stylesheet.

When there is genuinely nothing to style, omit the CSS file and add `styles: false` to
the local component spec. The structure test requires exactly that declaration, so an
accidentally missing stylesheet and an intentional styleless component cannot look
the same. Do not add an empty CSS file.

## 3. Write the local README

Create `src/components/molecules/quote/README.md`. It becomes the component's
documentation page. For this example:

````markdown
# Quote

Use for a short quotation with a named source. Both fields are plain text.
For inline links or emphasis, extend the option contract before using markup.

## Usage

```example title="Quotation with attribution"
quote({ text: 'Keep the interface close to the task.', who: 'Design team' })
```

```options quote
```

## Composition

Place Quote in an organism or a site block. It renders its own quotation and
attribution and accepts no child components. It has no public styling hooks.
````

`example` fences run against the current exports during the docs build. Include
representative valid calls. Across the local examples, exercise every accepted enum
value and both boolean states, using omission for the default where useful. Do not
generate a Cartesian product: constraints make many combinations deliberately
invalid.

`options` is generated from the component spec. Never type its signature, defaults,
nested fields or constraints by hand.

## 4. Export it

Add one static line to `src/index.js`:

```js
export { quote } from './components/molecules/quote/quote.js';
```

That is the only manual registration for an ordinary component. Folder discovery adds
its CSS to the build, its README to the docs site and its signature and link to `llms.txt`.
`npm test` finds `*.test.mjs` files recursively below `src/` and `test/`.
Put component-specific behavior and regression checks beside the component. Shared
option validation, documentation and architecture checks belong in `test/`; do not
repeat them for each component. See [Testing](testing.md).

### If the component uses browser behavior

Declare the shared browser modules it uses in the component spec, for example
`runtime: ['nav']` for a component using `src/runtime/nav.js`. The Quote example needs
no runtime module. All runtime modules must have a documentation owner; declared
modules are included in the component's documentation fingerprint.

## 5. Record the documentation review

For a new component, or after its renderer, stylesheet or declared runtime changes,
read the complete local README and record what you checked:

Check the options, defaults, examples, composition guidance and any browser behavior
against the current source. Then record the review:

```sh
npm run docs:review -- quote --reason "Reviewed the text and who options, example and composition guidance."
```

If the README still describes the behavior exactly, say why instead of silently
refreshing the marker:

```sh
npm run docs:review -- quote --reason "No doc change: renamed a private local only."
```

The command writes a hidden `docs-review` checksum and reason into the component
README. `npm test` recomputes the checksum from `<name>.js`, `<name>.css` and any
declared runtime modules; a mismatch fails with both source and README paths plus the
acknowledgement command. The checksum only proves that someone reviewed the README
after the source changed; it cannot check the prose itself.

## Generate and check

Run every command below from `jamshoot-design/`, in order. Fix any failure before
continuing:

```sh
npm run tables                    # refresh generated Markdown blocks
npm run llms                      # refresh the compact catalog
npm run docs:review -- --check     # confirm source changes have review markers
npm run docs -- --out /tmp/jamshoot-design-docs # execute examples and build docs
npm test                          # unit, contract, build, docs and component tests
node src/cli/lint.mjs test/fixtures/site
```

The build tests render `test/fixtures/site` with the current source tree into a
temporary directory and lint that output. They never write generated files into the
fixture.

The checks report a missing export, README, stylesheet declaration, stale generated
block, uncovered enum/boolean value, invalid example, unreviewed source/documentation
drift, foreign component selector or dangling package path by component name.

For example, a `docs-review` failure names the source and README paths: review that
README, run the acknowledgement command from step 5 with a specific reason, then
rerun the failed check. For a stale generated table, run `npm run tables`, inspect
the result and check again.

The component is ready for review when all checks pass and you have inspected its
rendered documentation example in a browser. Check narrow layouts and, for
interactive components, keyboard operation and visible focus. Automated tests do
not include a browser or screenshot runner; see [Testing](testing.md).

To view the documentation locally, run `npm run serve` from `jamshoot-design/` and
open [localhost:4180](http://localhost:4180). This command rebuilds the documentation
when source files change. If the server is already running, open the component's
page from the navigation.

## Changing the contract

- **Option:** edit the local spec and renderer, then update local examples.
- **Enum or boolean:** declare it locally and cover valid values in README examples.
- **Constraint:** declare it in the local spec; the generated table prints it.
- **Component token:** add one entry to `COMPONENT_TOKENS` in `src/tokens/contract.js`,
  then read it in the owning CSS with the exact declared fallback. Tokens are site-owned
  values, not per-call state. See [Theming](theming.md) for the contract.
- **Color role:** widen `ROLES` only when the twelve color roles cannot express a
  single-purpose component. Every site theme must then adopt the new role.

The token contract remains the only list of names, accepted values and fallbacks. Do
not add a parallel schema, manifest or type declaration.
