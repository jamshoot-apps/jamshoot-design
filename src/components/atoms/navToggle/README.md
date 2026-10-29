# Navigation toggle

<!-- docs-review: a9c377fb4797; reason: Documented Escape handling added to the declared nav runtime -->

The accessible disclosure button used by responsive headers.

For template-rendered sites, configure navigation through
[site configuration](https://jamshoot-apps.github.io/jamshoot-design/configuration.html).
[Header](../../organisms/header/README.md) supplies the toggle, navigation and
responsive visibility styles. A site block using this atom must supply those
surrounding parts itself.

## Usage

This is a static markup preview: the navigation is shown so its relationship to the
button is visible. It does not open or close here. The documentation's `nav` runtime
controls the documentation menu, which is the first toggle in the document.

In a site-owned block, import `navToggle` from `@jamshoot-apps/design` and `h` from
`@jamshoot-apps/design/markup`; see
[example context](https://jamshoot-apps.github.io/jamshoot-design/authoring.html#component-example-context).

```example title="Button and controlled navigation — static preview"
h('div', {}, [
  navToggle({ controls: 'example-nav', label: 'Toggle example navigation' }),
  h('nav', { id: 'example-nav', 'aria-label': 'Example' }, [
    h('a', { href: '#composition', text: 'Composition' }),
  ]),
])
```

```options navToggle
| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `controls` | `string` | required | The id of the navigation this button opens. |
| `label` | `string` | default `Toggle navigation` | Its accessible name. |
```

## Composition

Standalone integration needs `nav` in the site's `runtime`, a navigation element
whose id matches `controls`, and block-owned styles for its closed and open states.
`src/runtime/nav.js` updates `aria-expanded` on the button and `data-open` on the navigation;
it does not provide those visibility styles. Use only one navigation toggle per
document: the runtime connects to the first one. A template-rendered page already
has Header's toggle, so an additional independent disclosure needs block-owned behavior.

The component owns both state icons. A parent may hide the button through its own
wrapper; Header does so from 52 rem. Following a navigation link closes the
disclosure; resizing to a layout where the toggle is hidden also resets
`aria-expanded`. Escape closes an open disclosure and returns focus to the button
when focus was inside the navigation. Without the runtime, the atom does not toggle anything.
Header's responsive layout and scroll behavior belong to its own contract.

## For library maintainers

Its shape — a glyph centered on a tap target, muted until hovered — is `.ds-icon-button`
in `src/styles/base.css`, shared with the theme toggle beside it. The local stylesheet only
pulls the button flush with the gutter and hides whichever icon is not the current
state.
