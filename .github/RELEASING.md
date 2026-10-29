# Manual deployment and releases

All three workflows use only `workflow_dispatch`. Commits, tags and GitHub Releases
do not start any workflow. Open **Actions**, select a workflow and click **Run
workflow**. The workflow files must first be present on the default branch.

The runners use Node 24 and its bundled npm (trusted publishing requires npm 11.5.1
or newer). This library has no dependencies or lockfile, so no install step is needed.
Each workflow runs the full tests, generated-documentation checks, fixture lint and
fixture build before deployment or publication. A stale generated table or catalog
fails the workflow rather than silently changing the release.

Published implementation and required resources are under `src/`. The npm allowlist
excludes the full documentation, `scripts/`, shared tests and workflow files. The
package regression tests pack an actual archive, install it offline into a separate
site and check public imports, executable commands and API-contract links.
Documentation is built separately from the source checkout using `scripts/`.

## Documentation on GitHub Pages

1. In [jamshoot-apps/jamshoot-design](https://github.com/jamshoot-apps/jamshoot-design),
   open **Settings → Pages → Build and deployment** and
   set **Source** to **GitHub Actions**.
2. Run **Deploy documentation** (`docs-pages.yml`) from the default branch.
3. Open the deployment URL shown by the `github-pages` environment.

`npm run docs` produces `dist-docs/`, including HTML, CSS, runtime scripts, brand
assets, licenses and the Markdown catalog. The workflow uploads that directory
using the official Pages artifact action. Assets and navigation are relative, so
both `https://OWNER.github.io/REPOSITORY/` and a custom domain work without a base-path
setting. The default project URL is
`https://jamshoot-apps.github.io/jamshoot-design/`.
The documentation needs no server-side runtime.

Pages availability for a private repository depends on the GitHub plan. A public
repository can use GitHub Free. Configure the `github-pages` environment's deployment
branches if you want to restrict deployments to the default branch.

## Annotated tag and GitHub Release

1. Prepare matching versions in `package.json` and `CHANGELOG.md`. `CHANGELOG.md`
   must keep an empty `## [Unreleased]` heading as its first `##` section, above the
   newest dated section, including for `1.0.0`. The workflow rejects a missing or
   non-empty `[Unreleased]` section. The second `##` section must be the release, for
   example `## [1.0.0] — 2026-10-28`, with non-empty notes. For later releases, move
   any `[Unreleased]` entries into a new dated section placed directly below the empty
   `## [Unreleased]` heading.
2. Commit and push the prepared version to GitHub's default branch. If a local hook
   requires a version tag in the same push, follow the repository's atomic push
   procedure; the workflow accepts an existing annotated tag on the same commit.
3. Run **Create tag and GitHub Release** (`github-release.yml`) on the default branch.

The workflow validates the selected commit, creates annotated tag `v<version>`, pushes
that tag and creates a GitHub Release using the matching changelog section. It does
not bump the version or commit files. Only stable `X.Y.Z` versions are supported.
An existing tag must be annotated and point to the selected commit; tags are never
moved. A retry preserves an existing release and can finish creating one after a
successful tag push. Repository rules must permit `GITHUB_TOKEN` to create the tag
and release. npm publication is a separate manual workflow.

## npm trusted publishing (OIDC)

Set up the package on npm before the first workflow publication:

1. Ensure you control the `@jamshoot-apps` scope and have permission to publish
   `@jamshoot-apps/design`. If the package does not exist yet, publish its first version
   locally while authenticated to npm, then configure its Trusted Publisher. For
   that bootstrap, check out the prepared release and run
   `npm publish --access public`. Use a new version for the next publication.
2. Create a GitHub environment named **npm**. Optional reviewers or deployment rules
   belong in that environment's settings.
3. In npm, open the package's **Settings → Trusted publishing** and add GitHub Actions:
   - Organization or user: **jamshoot-apps**.
   - Repository: **jamshoot-design**.
   - Workflow filename: **npm-publish.yml**, without `.github/workflows/`.
   - Environment name: **npm**.
   - Allowed actions: enable direct **npm publish**.
4. Create the GitHub Release using the preceding workflow.
5. Run **Publish to npm (OIDC)** (`npm-publish.yml`) from the default branch and enter
   its tag, such as `v1.0.0`.

The workflow requires a published stable GitHub Release and an annotated tag whose
version matches `package.json` and whose commit belongs to the default branch. It
checks out and validates that tag, then verifies `repository.url` against the actual
GitHub repository. The package metadata permits publication. The npm package is
public and uses the `latest` dist-tag. No `NPM_TOKEN` or `NODE_AUTH_TOKEN` secret is
needed; `id-token: write` grants OIDC authentication on the GitHub-hosted runner.

Run the first publication within two days of creating the npm trust configuration;
an unused configuration expires. Provenance is automatic for public packages
published from public repositories. npm versions are immutable: a retry after a
successful publication requires a new version rather than overwriting the old one.

References: [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages),
[Pages availability](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages),
[npm trusted publishers](https://docs.npmjs.com/trusted-publishers/).
