# Icon set

<!-- docs-review: d753dd2ff62c; reason: Reviewed built-in SVG lookup under src/assets/icons, documentation-only icons under docs/assets/icons, CLI usage and licence delivery. -->

Icons are SVGs on a 512 grid drawn in `currentColor`; components inline them at build
time. The eight icons the components draw themselves are built in, in `src/assets/icons/`:
`menu` and `close` (navigation toggle), `chevron-down` (FAQ), `checkmark` and
`arrow-forward` (Plan), and `sunny-outline`, `moon-outline` and `contrast-outline`
(theme toggle). These names are also available to site components without configuration.

## Use a built-in icon

In an existing site's `pages.js`, import the components you need:

```js
import { button, section } from '@jamshoot-apps/design';
```

Include this section in a page's `render()` array. Supply your own copy and link
destination; the example uses `guide.html` as a placeholder.

```example title="A button with a built-in icon"
section({
  title: 'Project resources',
  content: button({ label: 'Read the guide', href: 'guide.html', icon: 'arrow-forward' }),
})
```

No icon package or `JAMSHOOT_ICONS_DIR` setting is needed for this example.
[Authoring](../authoring.md#compose-pages) explains the page structure.
Use the [Icon component](../../src/components/atoms/icon/README.md) for a standalone
SVG, or a component's `icon` option when it provides the surrounding layout.

## Choose an icon

The grid previews the documentation's configured set. Only the eight names listed
above are built in; every other preview uses an SVG from `docs/assets/icons/`. Sites do not
load that directory automatically. To use an extra icon such as `star`, provide
`star.svg` in your own configured directory and retain its license notice.

`iconNames()` returns the sorted names available in the current build environment.
Use it for tooling and catalogs; choose explicit names for page content so adding an
asset cannot change what the page displays.

```example title="Documentation icon set — includes additional SVGs"
h('div', { class: 'icon-grid' }, iconNames().map((name) =>
  h('div', { class: 'icon-grid__item' }, [icon({ name }), h('code', { text: name })])))
```

The grid uses documentation-specific markup and styles. Component usage examples
use built-in names so they can be copied without an extra SVG directory.

## Your own icons

Put trusted SVG files in a directory of your choice. Keep their required license
notices under the site's `assets/` so the build copies them. For example:

```text
icons/
  star.svg
assets/
  licenses/
    custom-icons-LICENSE.txt
```

`JAMSHOOT_ICONS_DIR` is an environment variable containing the path to that SVG
directory, not a list of icon names. From this site's root, build and then lint with:

```sh
JAMSHOOT_ICONS_DIR=./icons npx --no-install jamshoot-build .
JAMSHOOT_ICONS_DIR=./icons npx --no-install jamshoot-lint .
```

These commands use POSIX shell syntax. In another shell, set the environment variable
before running the same commands. Use an absolute directory path when running from
another working directory. SVGs are inlined into HTML; no browser setting is needed.

Icon names are the filenames without `.svg`. For example, a site block can render
the configured `star.svg` with:

```js
import { icon } from '@jamshoot-apps/design';

export const rating = () => icon({ name: 'star', label: 'Rated' });
```

A file with a built-in name replaces that icon; every other
built-in icon stays available. An unknown name fails at build time and lists the
available icons. Icon options are checked when a component renders, so importing
components before setting the variable does not freeze the set.
Relative directories resolve from the working directory. A configured directory
that is missing or is a file fails with an error; leaving the variable unset uses
only the built-ins.

Use a `viewBox="0 0 512 512"`, draw in `currentColor` and omit fixed width and height
on the SVG root. The loader inlines the file without sanitizing it; only use artwork
you trust. Build-time name validation does not make an untrusted SVG safe.

## Size and accessibility

A standalone icon inherits `--ds-icon-size`, which defaults to `--ds-icon-lg`
(1.5rem). Library components choose their own size: Button uses `--ds-icon-md`
(1.125rem) on its icon wrapper.

In a site-owned block, set the size on the block's own container using the existing
icon scale, for example in `blocks/project-status.css`:

```css
.project-status {
  --ds-icon-size: var(--ds-icon-sm);
}
```

Do not set icon width directly, target `.ds-icon` from site CSS or add this primitive
to `theme.css`. See [Naming conventions](../conventions.md) for block ownership.

When text already conveys the meaning, omit `label`; the icon is hidden from
assistive technology. Give a standalone meaningful icon a `label`, as in the rating
example above. See the [Icon API](../../src/components/atoms/icon/README.md#composition).

## Licenses

The built-in icons are from [Ionicons](https://ionic.io/ionicons), MIT-licensed;
the notice is in `src/assets/icons/LICENSE.txt`. The three theme icons use Ionicons
v5.5.2 geometry; source and normalization details are in `src/assets/icons/README.md`.
Site and docs builds copy the notice to `licenses/ionicons.txt`. Retain it when
distributing the output.

For the custom directory example, check that `dist/assets/licenses/custom-icons-LICENSE.txt`
exists after building and keep it with the deployed files. The built-in notice does
not replace any notices required by your own SVGs.

## Rules

- No icon font and no multi-tone artwork.
- Do not mix the filled and outline version of the same idea on one page.
- Choose a consistent set of icons for the actions and concepts the site needs.

## For library maintainers

The docs build and `npm test` configure `docs/assets/icons/` as their extra SVG directory.
When changing `src/assets/icons/` or `docs/assets/icons/`, update its `MANIFEST.sha256` and keep
its notice. `npm test` checks the checksums, the 512 grid, the absence of fixed
colors and the root sizing of every repository icon.
