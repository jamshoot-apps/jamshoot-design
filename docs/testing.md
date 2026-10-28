# Testing

Changing the library? Use this page to run the test suite and decide where a new
test belongs. For the full change checklist, see
[Generate and check](adding-a-component.md#generate-and-check).

## Run tests

From `jamshoot-design/` with Node.js 22 or later:

```sh
npm test
npm test -- --test-name-pattern=card
```

The second command filters test names. Run the full suite before handing off a
change. It discovers `*.test.mjs` recursively under `src/` and `test/`, using Node's
built-in runner with no dependencies or test-file registry.

`npm test` sets `JAMSHOOT_ICONS_DIR` to the absolute `docs/assets/icons` path. If you invoke
`node --test` directly, set that variable when a test renders a content icon.

## Where a test belongs

| Responsibility | Location |
| --- | --- |
| One component's rendering, constraints or regression, including Header and Footer | `src/components/<group>/<name>/<name>.test.mjs` |
| Shared API, token, stylesheet and repository invariants | `test/contracts/` |
| An isolated utility or validator | `test/unit/` |
| Executable examples, generated docs, links and review markers | `test/docs/` |
| Lint rules | `test/lint/` |
| Build output, development server, CLI and Git hooks | `test/integration/` |
| Minimal consumer site | `test/fixtures/site/` |
| Setup reused by multiple test files | `test/support/` |

Name test files after their subject. Helpers and fixtures use `.js` or `.mjs`;
a test file must not import another test file. Component tests import their local
renderer and read owned files relative to `import.meta.url`.

## What to cover

README examples already check enum/boolean values, successful rendering and CSS
modifiers. Shared tests check contract and documentation parity. Add local tests
for behavior or regressions those checks cannot establish; simple components do
not need an empty test file.

Assert expected content, semantics and errors independently of the renderer.
When markup, styling or runtime behavior changes, check layout, focus and keyboard
behavior in a browser too: the suite has no browser or screenshot runner.

Source changes can require a documentation review, including declared runtime,
configuration and build behavior. Follow the
[documentation review workflow](adding-a-component.md#5-record-the-documentation-review)
and resolve failing checks before committing or releasing.

## Shared setup

Reuse helpers in `test/support/`:

- `library.mjs`: library paths and source reads.
- `components.mjs`: component discovery and executable README examples.
- `lint-site.mjs`: temporary lint fixtures and diagnostics.

Keep assertions and scenario data in their tests. Integration builds use temporary
directories and clean up afterwards; never build into fixture sources or neighbouring
repositories.
