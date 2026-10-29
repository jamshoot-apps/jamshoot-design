# Agent guide

This repository contains `@jamshoot-apps/design`, a standalone design system and static
site toolkit. Use Node.js 22 or newer. The package has no npm dependencies; do not
add dependencies or assume another repository exists beside this checkout.

## Start here

- Read `README.md` for installation, public APIs and development commands.
- Use `llms.txt` to discover components and find their documented contracts.
- Read `CONTRIBUTING.md` before changing the library.
- Use `docs/architecture.md` for ownership and component dependencies,
  `docs/authoring.md` for site composition, and `docs/testing.md` for test ownership.
- Read the affected component's local `README.md` before editing its implementation.

## Repository map

| Path | Purpose |
| --- | --- |
| `src/index.js` | Public component exports. |
| `src/markup.js` | Public markup helpers for site blocks. |
| `src/define.js` | Component specifications and option validation. |
| `src/config.js` | Site configuration contract. |
| `src/components/<group>/<name>/` | Component renderer, CSS, README and optional behavior tests. |
| `src/templates.js` | Page composition, metadata and shared template. |
| `src/tokens/contract.js` | Public tokens, allowed site overrides and shared constants. |
| `src/tokens/`, `src/styles/` | Reset, primitives, starter palettes and base styles. |
| `src/runtime/` | Browser behavior declared by components or site configuration. |
| `src/cli/` | Published build, lint, development and OG-image tools and their helpers. |
| `scripts/` | Repository-only documentation, generation and test tools. |
| `docs/` | Guides, foundations, examples and checked documentation. |
| `test/` | Shared contracts, unit, integration, documentation and lint checks. |
| `test/fixtures/site/` | Self-contained example site for verification. |
| `src/assets/icons/` | Published built-in icons and their licensing notices. |
| `docs/assets/` | Documentation-only artwork and example icons. |
| `.github/workflows/` | Manual documentation deployment and release workflows. |

## Change boundaries

The library owns component markup, spacing, type scale, radii, motion and
breakpoints. A site owns its content, blocks, twelve color roles,
`color-scheme` and component tokens allowed by `src/tokens/contract.js`.

Sites import public package exports, never internal source paths. Runners accept
explicit site paths; named lookup requires configured search roots. Do not add
implicit sibling-repository discovery.

Components declare their options through `defineComponent` and their browser
modules through the local runtime specification. Header and Footer are public
organisms and follow the same discovery, validation, examples and regression gates
as other components. Do not introduce a template exemption.

Keep behavior tests beside the component as `<name>.test.mjs`. Shared checks belong
in the corresponding `test/` directory. Tests are discovered recursively; do not
maintain a test-file registry. New visual rules must appear in both
`docs/anti-patterns.md` and `src/cli/lint.mjs`.

## Generated documentation

After changing a specification, regenerate tables and the catalog. Review the
complete affected README or guide before acknowledging a documentation fingerprint:

```sh
npm run tables
npm run llms
npm run docs:review -- COMPONENT --reason "Describe the reviewed change"
```

Review targets also include `siteConfig`, `build` and `icons`. Fingerprints cover
renderer, CSS, declared runtime and relevant build dependencies. Never refresh a
marker without a real review, hand-edit generated tables or weaken the drift gates.

## Verification

Run these checks before declaring a change complete:

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

Build before linting so output checks run against current generated files. Failing
or skipped required checks block completion, commits and releases. Review generated
changes. When a site is explicitly in scope, validate its build and lint too.
Preserve checks for API tables, executable examples, option coverage, documentation
drift and the Header/Footer public contract.
Keep a regression proving that unacknowledged source changes fail documentation
checks when modifying those gates.

If local hooks are enabled, keep their gates intact. Stage or set aside unstaged
and untracked files before committing so tests cover the committed snapshot. Never
bypass a failing hook.

## Publication and repository hygiene

All shipped code and required resources belong under `src/`. Keep documentation
site tools under `scripts/`, full guides and demonstration artwork under `docs/`,
and shared checks under `test/`. Package `src/` without behavior tests, plus the
root README, licenses, NOTICE and `llms.txt`. Component READMEs remain available
offline; links to full guides must use public documentation URLs. Do not make a
published module depend on files from `scripts/`, `docs/` or `test/`.

Preserve public `exports` when moving internal files. Installed command-line tools
are exposed through `package.json.bin`, not hard-coded paths into `node_modules`.
Validate an actual tarball installed into a separate site, including build, lint,
public imports, starter palette resolution and local documentation links.

Do not commit generated `dist/` or `dist-docs/`, dependencies, local tool state,
credentials, personal information or machine-specific paths. Use fictional example
data and English documentation. Preserve Apache 2.0, third-party notices and the
separate JamShoot brand-asset terms described in `NOTICE`.

Plain text fields are escaped; authored HTML fields require trusted input. Build
configuration and site blocks execute JavaScript. See `SECURITY.md` for trust
boundaries and private reporting.

Version changes, tags, releases and npm publication require explicit authorization.
Read `.github/RELEASING.md` for the release procedure. All GitHub workflows must
remain manual (`workflow_dispatch`); do not add commit, tag or release triggers.
