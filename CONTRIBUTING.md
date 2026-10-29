# Contributing

Use Node.js 22 or newer. The library has no npm dependencies; a source checkout is
enough to run its tests, documentation and fixture builds.

Open an issue for a bug with a minimal reproduction, the Node version, the library
version and the expected result. For a change to the public API or visual rules,
describe the proposed behavior and affected sites before implementation.

## Work on a change

1. Create a branch from the default branch.
2. Keep component renderer, styles, examples and behavior tests together under
   `src/components/<group>/<name>/`.
3. Update the relevant guides and `CHANGELOG.md`. Document public option and runtime
   changes, including migration steps for breaking changes.
4. Regenerate API tables and the compact catalog, then run the checks below.
5. Open a pull request with the problem, resulting behavior and validation results.

Component functions take one options object and declare their contract through
`defineComponent`. Header and Footer follow the same public component rules as the
other organisms. New visual rules belong in both `docs/anti-patterns.md` and the
lint runner. Keep `dependencies` empty; the library uses Node's standard library.

Read [Adding a component](docs/adding-a-component.md),
[Architecture](docs/architecture.md) and [Testing](docs/testing.md) before changing a
component contract or build behavior.

Keep published modules and resources in `src/`, including the published
command-line tools in `src/cli/`. Repository-only generators and checks belong in
`scripts/`. Full guides and documentation artwork belong in `docs/` and are excluded
from npm. Component
READMEs are shipped as API contracts; their guide links must work from an installed
package. Do not introduce a dependency from published code to repository tooling.

## Documentation checks

After changing a component specification, run `npm run tables` and `npm run llms`.
Read the affected component README after changing renderer, CSS or declared runtime.
Record that review with:

```sh
npm run docs:review -- COMPONENT --reason "Describe the reviewed change"
```

Configuration, build and icon behavior have their own review targets: `siteConfig`,
`build` and `icons`. Never refresh a marker
without reading the affected guide. Do not edit generated tables by hand or weaken
a check to accept an unexplained mismatch.

## Required checks

```sh
npm run tables
npm run llms
npm run docs:review -- --check
npm run docs
npm test
node src/cli/build.mjs test/fixtures/site
node src/cli/lint.mjs test/fixtures/site
npm pack --dry-run
```

Review the generated changes before committing. A failing or skipped required check
is not a passing result. Do not commit build output, dependencies, credentials or
machine-specific files.

Optional local hooks can be enabled with `npm run hooks`. They run the test gate,
require changelog acknowledgement, and enforce annotated release tags for version
changes. Stage all files before committing with these hooks so tests cover the
snapshot being committed. See [Deployment and releases](.github/RELEASING.md) before
changing the package version.

GitHub deployment and publishing workflows are manual. A contribution does not
deploy documentation or publish a package automatically. Pull requests are not
checked automatically by CI, so run the required checks locally and paste their
results into the pull request. Maintainers re-run them before merging.

## License

Contributions to library code and documentation are submitted under Apache License
2.0. Keep third-party notices and the separate JamShoot brand-asset terms intact.
