# Rules

Use this reference to understand lint errors, find where to make a change, and see
which checks still need browser review. Lint checks the shared library and the
selected site together: its theme, blocks, content and generated output.

## Run the checks

From the library checkout, replace `/path/to/site` with your site directory:

```sh
node src/cli/build.mjs /path/to/site
node src/cli/lint.mjs /path/to/site
```

Build before linting so output checks read the current generation. Build does not
run lint automatically. Without `dist/`, lint skips `no-js-content` and `assets`;
an existing `dist/` is checked as it stands. A skipped check
has not passed. See [Authoring a site](authoring.md#build-and-lint) for runner setup.

Each failure reports a rule name, a file and a specific problem:

```
theme-color  src/components/molecules/card/card.css
        Color outside the theme — literal color #2b2b2b
```

Find the rule below, correct the source, then build and lint again. For this error,
replace the literal color with the appropriate theme role. A path inside
`src/components/` points to a library change; a path inside your site's `blocks/`
points to a local change. Fix output errors in their source or build configuration,
then rebuild. Do not edit generated files in `dist/`.

The build validates component options. Lint checks the rules listed here and exits
with an error when a rule fails. Browser review checks the resulting appearance and
behavior. Passing lint does not establish WCAG conformance.

## Find a rule

| Task | Rules |
| --- | --- |
| [Theme and tokens](#theme-and-tokens) | [theme-contract](#theme-contract-a-site-token-outside-the-contract), [theme-color](#theme-color-color-outside-the-theme), [contrast](#contrast-unreadable-text-and-boundaries-that-are-not-there), [scale](#scale-a-size-that-is-not-on-a-scale), [breakpoint](#breakpoint-a-fourth-breakpoint) |
| [Markup and composition](#markup-and-composition) | [page-markup](#page-markup-a-page-that-writes-markup-by-hand), [component-boundary](#component-boundary-a-component-stylesheet-that-selects-a-neighbor), [layer](#layer-a-stylesheet-that-assigns-its-own-cascade-layer) |
| [Interaction and accessibility](#interaction-and-accessibility) | [focus-visible](#focus-visible-an-interactive-element-with-no-visible-focus), [tap-target](#tap-target-a-tap-target-under-the-standard), [reduced-motion](#reduced-motion-motion-with-no-way-out), [scroll-animation](#scroll-animation-animation-driven-by-scrolling) |
| [Visual effects and copy](#visual-effects-and-copy) | [gradient](#gradient-a-gradient-with-no-reason), [glass](#glass-glass-with-nothing-behind-it), [hollow-claims](#hollow-claims-marketing-words-that-survive-no-edit) |
| [Generated output](#generated-output) | [no-js-content](#no-js-content-a-page-that-needs-javascript-to-say-anything), [assets](#assets-unversioned-or-duplicated-assets), [og-image](#og-image-a-configured-share-image-that-is-missing) |
| [Library token contracts](#library-token-contracts) | [token-default](#token-default-a-component-token-that-lies-about-its-default), [token-assignment](#token-assignment-a-library-rule-that-assigns-a-site-component-token) |

Also on this page: [documented exceptions](#documented-exceptions),
[design review checklist](#design-review-checklist),
[library test checks](#library-test-checks), [changing a rule](#adding-a-rule).

## Where to make a change

| Change | Owner | Guide |
| --- | --- | --- |
| Brand colors, palettes and permitted component tokens | Site theme | [Theming](theming.md) |
| Content and page composition | Site content and component calls | [Authoring a site](authoring.md) |
| Markup and decoration needed by one site | Site `blocks/`, within shared token and accessibility rules | [Site blocks](authoring.md#site-blocks) |
| Shared component markup, spacing, type, radii, motion and breakpoints | Library | [Architecture](architecture.md), [Adding a component](adding-a-component.md) |
| Asset assembly, cascade layers and output cleanup | Library build | [What ships](authoring.md#what-ships) |

Rule origins explain why a restriction exists: **Standard** means an
accessibility-related check, **House** means shared design policy, and
**Architecture** means a boundary between library and site responsibilities.
The lint registry retains these classifications; `no-js-content` is registered as
Standard even though its text-length threshold is house policy. The sections below
group rules by task instead.

## Theme and tokens

### `theme-contract` — A site token outside the contract

**Rule:** keep site customization within `src/tokens/contract.js`. The base `theme.css`
sets all twelve color roles and `color-scheme`; permitted component tokens are
optional. Extra palettes in `themes/` may inherit roles from the base.

**Checked in:** site palettes and component-token assignments in block CSS. Lint
checks palette structure and names, required base roles, allowed `--ds-*` tokens,
component-token values and assignments to private `--_*` variables.

**Fix:** use permitted tokens and values. Keep each palette in one `:root` block;
use valid, distinct palette names, reserve `default` for the base, and make a palette
named `light` or `dark` declare that scheme. Each extra palette must declare at least
one color role. See [Theming](theming.md) for the complete contract.

**Exceptions and limits:** site motif colors may use a site prefix, such as
`--example-paper`, in palettes. Blocks may assign permitted component tokens locally.
Neither permits assignments to library-private `--_*` variables. Resolved palette
contrast is checked separately by `contrast`.

### `theme-color` — Color outside the theme

**Rule:** read color roles instead of writing literal colors in component or block
CSS, so the same component works across palettes.

**Checked in:** library and block styles outside token and palette files, for hex,
RGB, HSL and OKLCH colors in the forms the checker recognizes.

**Fix:** replace the literal with a role, such as `var(--ds-text)` or
`var(--ds-surface)`. Declare site motif colors in a palette under the site's prefix.

**Exceptions and limits:** translucent pure black and white RGB shading is allowed.
A deliberate literal needs `ds-allow: color`; see [documented exceptions](#documented-exceptions).
This source check is not a complete CSS color parser.

### `contrast` — Unreadable text, and boundaries that are not there

**Rule:** color roles must meet the contract's contrast ratios on their declared
backgrounds. These checks support the WCAG 2.2 AA target.

**Checked in:** every resolved site palette, including values inherited from the base.

| Role | Against | Minimum | Basis |
| --- | --- | --- | --- |
| `text`, `text-muted`, `text-faint` | Every surface | 4.5:1 | WCAG 2.2 §1.4.3 |
| `on-accent` | `accent`, `accent-strong` | 4.5:1 | Text on accent fills |
| `accent`, `accent-strong` | Every surface | 4.5:1 | Ordinary links; exceeds the 3:1 non-text minimum |
| `border-strong` | Every surface | 3:1 | WCAG 2.2 §1.4.11; meaningful control boundaries |

**Fix:** adjust the foreground or background role named in the diagnostic. Use a
hex or RGB value the checker can measure, and keep surfaces opaque. Translucent
foregrounds are composited onto the background before measurement. An unparseable
color fails rather than being skipped.

**Exceptions and limits:** decorative `border` is exempt. Lint checks declared role
pairs, not every rendered combination or image background. Hue is a site's brand
choice; review actual use in the browser. See [Color](foundations/color.md).

### `scale` — A size that is not on a scale

**Rule:** use the library's scales for dimensions and typography. Site blocks share
the spacing, radius, typography and stacking scales while retaining control over
their own decorative geometry.

**Checked in:** library and block CSS outside token and palette files. Library
declarations are checked for raw lengths; block declarations have narrower checks
for margins, padding, gaps and radii. Typography and `z-index` are checked in both.

**Fix:** read tokens from `src/tokens/primitives.css`. For a `scale` error in your site's
`blocks/panel.css`, the correction belongs to that site:

```css
/* Before */
.site-panel { padding: 13px; }

/* After */
.site-panel { padding: var(--ds-space-sm); }
```

Save the change in `blocks/panel.css`, then run the build and lint commands above
for that site's directory. No library change is needed for this correction.

Use `--ds-layer-chrome` or `--ds-layer-top` for stacking. See
[Space, radius and motion](foundations/space.md) and [Typography](foundations/type.md).

**Exceptions and limits:** percentages, `fr` and unitless `calc()` multipliers are
allowed. A block's decorative geometry, such as perspective or blur, is outside
its spacing checks. Deliberate exceptions use `ds-allow: length`, `type` or `layer`;
the last applies to `z-index`, not `@layer` declarations.

### `breakpoint` — A fourth breakpoint

**Rule:** viewport width breakpoints use 34rem, 52rem or 64rem, as declared in
`src/tokens/contract.js`.

**Checked in:** `min-width` and `max-width` media queries in library and block CSS
outside token and palette files.

**Fix:** use the appropriate shared breakpoint. These values are written directly
because media queries cannot read CSS custom properties.

**Exceptions and limits:** container queries are outside this check. They respond
to a component's own box rather than the viewport; the library currently does not
use them. The check does not validate every possible media-query syntax.

## Markup and composition

### `page-markup` — A page that writes markup by hand

**Rule:** compose pages with component calls. Keep site-specific raw markup in
`blocks/`, so page code uses declared component options rather than library classes.

**Checked in:** `pages.js`, `site.config.js` and JavaScript under `content/`, for
imports from `@jamshoot-apps/design/markup` and literal `ds-` class names.

**Fix:** call the component that owns the markup. If one site needs a new shape,
put it in a local block; if the shape is shared, add or compose a library component.
See [Site blocks](authoring.md#site-blocks).

**Exceptions and limits:** blocks may import `@jamshoot-apps/design/markup` and compose
library components. Their CSS still follows the shared token, color and
accessibility rules. Lint recognizes source patterns; build-time option validation
is a separate check.

### `component-boundary` — A component stylesheet that selects a neighbor

**Rule:** a component styles the classes its own renderer emits. A parent places
or frames a child through a wrapper owned by the parent.

**Checked in:** library component stylesheets, comparing literal `.ds-*` selectors
with the BEM roots found in that component's renderer.

**Fix:** remove the foreign selector and render an owner wrapper. For example,
Card clips its own `.ds-card__media` wrapper while the child keeps its ordinary styles.

**Exceptions and limits:** descendant selectors within one namespace are allowed.
This check does not inspect tag selectors, attribute hooks or site-prefixed
classes, and does not replace composition review.

### `layer` — A stylesheet that assigns its own cascade layer

**Rule:** let the build assign cascade layers in the order declared by
`src/tokens/contract.js`.

**Checked in:** library styles, block styles and token or palette CSS files for
`@layer` declarations.

**Fix:** remove the local `@layer` wrapper. The build places block CSS in
`site.blocks` and library CSS in its assigned layers. See [What ships](authoring.md#what-ships).

**Exceptions and limits:** no `ds-allow` exception. `ds-allow: layer` belongs to the
`scale` rule's `z-index` check. Unlayered normal declarations override layered normal
declarations, so keep stylesheet assembly in the build.

## Interaction and accessibility

The accessibility target is WCAG 2.2 Level AA. Some system policies go further:
reduced motion references an AAA criterion, and the default tap-target token is
44px. These checks inspect source declarations; browser review is still required.

### `focus-visible` — An interactive element with no visible focus

**Rule:** keep a visible keyboard-focus indicator. WCAG 2.2 §2.4.7 is AA;
§2.4.13 Focus Appearance is AAA.

**Checked in:** `src/styles/base.css` for a global `:focus-visible` outline, and all checked
CSS files for outline removal without `:focus-visible` in the same file.

**Fix:** preserve the global outline. If a control removes it with `outline: none`
or `outline: 0`, provide an intentional `:focus-visible` replacement.

**Exceptions and limits:** replacing the default ring is allowed; hiding focus is
not. Lint checks source patterns, not the indicator's rendered area, contrast,
visibility or whether a replacement selector reaches the affected control.

### `tap-target` — A tap target under the standard

**Rule:** keep `--ds-tap-target` at least 24px; the system default remains 44px.
[WCAG 2.2 §2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)
sets a 24 × 24 CSS pixel minimum with spacing, equivalent-control, inline,
user-agent and essential-presentation exceptions.

**Checked in:** the `--ds-tap-target` declaration in `src/tokens/primitives.css`.

**Fix:** declare the primitive in pixels at or above the minimum, and use the
component's target sizing instead of shrinking the control locally.

**Exceptions and limits:** lint measures this primitive only. It does not measure
each rendered target or evaluate WCAG exceptions; verify size and spacing in the browser.

### `reduced-motion` — Motion with no way out

**Rule:** styles that introduce motion must account for reduced-motion preferences.
This is system policy beyond the AA target; WCAG 2.2 §2.3.3 is AAA.

**Checked in:** checked CSS files declaring `transition` or `animation` shorthand,
which must also contain `prefers-reduced-motion`.

**Fix:** add a `prefers-reduced-motion: reduce` treatment. The global reset stops
motion; a component needing a different resting state must define it locally.

**Exceptions and limits:** lint checks for the preference text in the file. It does
not evaluate the resulting state or cover every animation longhand; test reduced
motion in the browser.

### `scroll-animation` — Animation driven by scrolling

**Rule:** page content must not animate in response to scrolling. Motion caused by
a pointer, hover or explicit state change is allowed, subject to reduced motion.

**Checked in:** library runtime and block JavaScript for `IntersectionObserver`,
`onscroll` and quoted `scroll` events; checked CSS for `animation-timeline`,
`scroll()` and `view()`.

**Fix:** show content without scroll-triggered reveals or movement. Remove the
observer, listener or timeline driving the effect.

**Exceptions and limits:** only `src/runtime/nav.js` may use the scroll event, for
`nav.hideOnScroll`. The header hides on downward scroll, returns on upward scroll,
stays visible with an open menu or focus, and removes its transition under reduced
motion. See [Header on scroll](authoring.md#header-on-scroll). There is no site-level
exception; lint detects source patterns rather than observing behavior.

## Visual effects and copy

### `gradient` — A gradient with no reason

**Rule:** use gradients to depict a physical effect, such as light or a shadow,
rather than as an arbitrary surface fill.

**Checked in:** checked CSS files for linear, radial and conic gradient functions.

**Fix:** use a solid theme surface, or document why the gradient represents a
physical effect with `ds-allow: gradient` above the declaration.

**Exceptions and limits:** a documented physical effect is allowed. Lint checks
for the marker; a reviewer decides whether the reason supports the design.

### `glass` — Glass with nothing behind it

**Rule:** use `backdrop-filter` only when the background gives the effect a clear
purpose. Frosted glass over a solid background adds an effect without a material cue.

**Checked in:** checked CSS files for `backdrop-filter` declarations.

**Fix:** remove the effect, or put `/* ds-allow: backdrop — <reason> */` on the line
above the declaration. The marker is `backdrop`, not `glass` or `gradient`.

**Exceptions and limits:** lint checks for the marker, not the visual justification.
Review the effect against the actual content behind it.

### `hollow-claims` — Marketing words that survive no edit

**Rule:** describe supported product behavior instead of using stock claims.

**Checked in:** JavaScript under the site's `content/`, using case-insensitive
substring matches against `BANNED` in `src/cli/lint.mjs`.

**Fix:** replace the reported phrase with a concrete claim the product supports.
The list includes `seamless`, `effortless`, `empower`, `unleash`, `elevate your`,
`revolutionary`, `game-changing`, `game changing`, `cutting-edge`, `next-gen`,
`next-generation`, `military-grade`, `bank-level`, `peace of mind`,
`in today's fast-paced`, `take control of your`, `unlock the power`, `supercharge`
and `delve into`, including the variants in `BANNED`.

**Exceptions and limits:** no per-occurrence exception. Matches can occur inside
longer strings; lint does not assess context or evidence. Review other vague copy
using the [Language guide](foundations/language.md).

## Generated output

These checks read the selected site's `dist/`. Build first; lint reports them as
skipped when that directory is absent.

### `no-js-content` — A page that needs JavaScript to say anything

**Rule:** each generated HTML page must contain at least 500 characters of text
after script elements and HTML tags are stripped, plus a title and meta description.
The threshold is house policy, not a WCAG requirement.

**Checked in:** every HTML file under `dist/`; a directory with no HTML pages also fails.

**Fix:** supply the page's content, title and description in the source and render
meaningful content at build time. Rebuild before checking again.

**Exceptions and limits:** no per-page exception. The count is a static output
check; it does not prove that the text is useful or visible without CSS or
JavaScript. Do not add filler just to pass the threshold.

### `assets` — Unversioned or duplicated assets

**Rule:** each page links exactly one stylesheet and no more than one external
script. Linked CSS and JavaScript filenames end with an eight-character hexadecimal
content hash, such as `site.0123abcd.css`.

**Checked in:** stylesheet links and external script references in generated HTML.

**Fix:** use the normal build's shared asset assembly. Remove extra references
from the source or correct the build configuration, then rebuild.

**Exceptions and limits:** a page may have no external script. Inline scripts are
outside this count. The rule checks recognized HTML references and filename shape,
not every asset's contents or the correctness of its hash.

### `og-image` — A configured share image that is missing

**Rule:** when `site.config.js` specifies a local `ogImage.path`, it must name an
existing file in the site and, when build output exists, in that output too.
Omitting `ogImage` is allowed.

**Checked in:** site source files, even before a build. The CLI loads the site's
configuration; programmatic `lint(root, { site, dist })` accepts the same configuration
and an optional output directory (default `dist/`). Without build output only the
source file is checked.
Query strings and fragments are ignored, and URL-encoded filenames are decoded.
Root-relative paths under the configured public URL's subdirectory are mapped back
to the site root.

**Fix:** put the image under `assets/` so the build copies it, correct its path, or
remove the optional `ogImage` option. Rebuild after updating the source.
The ordinary site build does not enforce this rule or run the generator.

**Exceptions and limits:** absolute URLs and protocol-relative URLs are not fetched
or checked. File contents, dimensions and freshness are not validated.

## Library token contracts

These rules are for library maintainers. Site authors normally change permitted
component tokens in their theme or blocks rather than editing their defaults.

### `token-default` — A component token that lies about its default

**Rule:** every token in `COMPONENT_TOKENS` must be read by library CSS with a
fallback promised by the contract.

**Checked in:** library stylesheets against `src/tokens/contract.js`, including declared
variant fallbacks.

**Fix:** make each `var(--ds-…, <fallback>)` read match the declared default or
variant. If the intended default changes, update the contract and its documentation
alongside the CSS. Remove obsolete contract entries deliberately.

**Exceptions and limits:** declared variants may have different fallbacks. The
check compares source reads and declarations; it does not measure computed styles.

### `token-assignment` — A library rule that assigns a site component token

**Rule:** the library reads public component tokens but never assigns them. Sites
own those assignments. A library assignment can silently override the site's theme.

**Checked in:** library stylesheets for assignments to declared component tokens.

**Fix:** read the public token into a private variable. A modifier may choose a
different fallback without overwriting the site's value:

```css
.ds-grid { --_grid-min: var(--ds-grid-min, var(--ds-measure-xs)); }
.ds-grid--cell-md { --_grid-min: var(--ds-grid-min, var(--ds-measure-md)); }
```

**Exceptions and limits:** no library assignment exception. Both fallbacks must
be declared in the contract so `token-default` can check them. See
[Component tokens](theming.md#component-tokens).

## Documented exceptions

Use an exception only for a deliberate decision with a reason a reviewer can assess.
Write `/* ds-allow: <marker> — <reason> */` before the affected declaration. The
marker must match one of the names below exactly, including case, and the reason
after the em dash must contain non-whitespace text. An unknown marker, a partial
name or an empty reason grants no exception; the original violation still fails.

```css
.site-shadow {
  /* ds-allow: gradient — a cast shadow fades towards its edge. */
  background: radial-gradient(ellipse, rgb(0 0 0 / 0.3), transparent);
}
```

| Marker | Rule | What it permits |
| --- | --- | --- |
| `length` | `scale` | A raw length |
| `type` | `scale` | A typography value outside the scale |
| `layer` | `scale` | A `z-index` value outside the layer-token scale |
| `color` | `theme-color` | A literal color |
| `gradient` | `gradient` | A gradient function |
| `backdrop` | `glass` | A `backdrop-filter` declaration |

The comment applies only to the next declaration, including all matching values
in that declaration. Whitespace and other comments may intervene, but a selector,
another declaration or a block boundary ends the association. A marker inside a
declaration value or a quoted string grants no exception.

Reasons and declarations may span multiple lines; there is no 200-character limit.
Consecutive exception comments may grant different exceptions to the same next
declaration. Each comment needs its own marker and reason. For example, a gradient
with deliberate literal colors needs both `gradient` and `color`; permitting one
does not suppress the other check.

Lint checks that a reason exists, not whether it is convincing. A reviewer assesses
the decision. Other rules have no `ds-allow` exception. In particular,
`ds-allow: layer` does not permit `@layer`. Comments are excluded from CSS checks;
mentioning a motion preference in a comment does not implement that preference.

## Design review checklist

Review accessibility, visual decisions and component reuse manually. These checks
require judgment; passing lint does not establish that the design meets them.

- **Keyboard focus:** check every interactive control. The indicator must be visible,
  unobscured and clear against its actual background.
- **Targets and motion:** check rendered target sizes and spacing, and test the
  reduced-motion state. Source declarations alone do not establish the result.
- **Hero composition:** put copy on one side and the product on the other. Avoid a
  centered headline over a background wash that gives no view of the product.
- **Component corners:** bands, rules and dividers stay square. Cards, image frames
  and table scroll wrappers use their component radius; table cells stay square.
  See the [radius scale](foundations/space.md#radius).
- **Real product imagery:** use screenshots of the actual app. Until a shot exists,
  use a labeled empty [Figure](../src/components/molecules/figure/README.md).
- **One accent:** preserve the single accent family named by the contract; do not
  introduce a second independent accent through site decoration.
- **Shared shapes:** when a second site needs the same block, review it for promotion
  to a library component. See [Adding a component](adding-a-component.md).

## Library test checks

Repeated CSS shapes are checked by `test/contracts/styles.test.mjs`, run through
`npm test`. This is a library test, not a site lint rule or a purely manual check.
It reports pairs of library CSS rules sharing five or more normalized declarations
unless the pair has an explicit reviewed exception.

For each reported pair, extract a shared class into `src/styles/base.css`, compose the
component that owns the shape, or record the pair in `REVIEWED` in that test with a
reason for keeping it. A person chooses the correction; the test only identifies overlap.

## Adding a rule

A rule should name a specific defect, detect it reliably and explain a correction
in its diagnostic. Keep checks narrow enough that deliberate work does not produce
routine false failures. Leave judgments such as whether a hue fits a brand to review.

Change shared policy in the library, rather than bypassing it per site. Update the
rule in `src/cli/lint.mjs`, this reference and the relevant tests together. The
documentation test checks that every lint rule has a section here and that its
heading matches the diagnostic summary. Reviewing or changing this page alone does
not change lint behavior.
