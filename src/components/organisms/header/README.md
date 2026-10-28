# Header

<!-- docs-review: 8e40f4d61e0c; reason: Documented Escape closing the mobile menu and returning focus to the toggle -->

The shared brand and page navigation. For sites built with the page template,
configure it in `site.config.js`; the template renders it above `main` on every page.

Start with [Header navigation](https://jamshoot-apps.github.io/jamshoot-design/configuration.html#header-navigation)
and [Browser runtime](https://jamshoot-apps.github.io/jamshoot-design/configuration.html#browser-runtime). Keep `nav`
in `runtime` for the mobile menu, including when `hideOnScroll` is false. The calls
below document the component API used by the template; do not add another header
inside a page's `render` function.

## Usage

```example title="Pinned navigation"
header({
  brand: brand({ text: 'Example', tagline: 'Useful tools', href: 'index.html', compact: true }),
  links: [{ id: 'support', label: 'Support', href: 'support.html' }],
  activeId: 'support',
})
```

```example title="Navigation that leaves room for reading"
header({
  brand: brand({ text: 'Example', href: 'index.html', compact: true }),
  links: [{ label: 'Features', href: 'index.html#features' }, { label: 'Support', href: 'support.html' }],
  hideOnScroll: true,
  theme: themeToggle({ choices: [
    { label: 'Auto', icon: 'contrast-outline' },
    { label: 'Dark', palette: 'dark', icon: 'moon-outline' },
  ] }),
})
```

```options header
| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `brand` | `component call, string, or array of them` | required | The brand lockup, usually brand({ compact: true }). |
| `links` | `non-empty array of { label, href, id }` | required | The navigation links, in reading order. |
| `links[].label` | `string` | required | What the link says. |
| `links[].href` | `string` | required | Where the link goes. |
| `links[].id` | `string` | optional | Matches activeId to mark the current page. |
| `activeId` | `string` | optional | The current page id. |
| `label` | `string` | default `Primary` | The accessible name of the navigation. |
| `toggleLabel` | `string` | default `Toggle navigation` | The accessible name of the mobile menu button. |
| `hideOnScroll` | `true or false` | default `false` | Hide on downward scroll and reveal on upward scroll. Requires the nav runtime. |
| `theme` | `component call, string, or array of them` | optional | An optional themeToggle() beside the navigation. |
```

## Scroll and interaction

The default is a visible sticky header (`hideOnScroll: false`). With `true`, scrolling
down hides it and scrolling up reveals it without returning to the top. Eight pixels
of movement in one direction avoid jitter; overscroll at the page edges is clamped.
The header stays visible within its own height of the top, while its menu is open,
or while a descendant has focus. Focus reveals it immediately. Returning through
browser history starts with the header visible.

The `nav` runtime in `src/runtime/nav.js` handles the disclosure and scroll behavior.
It updates `aria-expanded`, closes the menu after a navigation link is followed,
and clears an open mobile menu when its button disappears in the desktop layout.
Escape closes an open mobile menu; if focus was in the navigation or on its button,
focus returns to the button. Escape does nothing while the menu is closed.
Below 52 rem navigation is a disclosure; from 52 rem it is a row. Reduced motion
removes the slide transition. Without JavaScript the header stays visible, desktop
navigation links remain available, and the mobile disclosure cannot be opened.

For template-rendered sites, set `nav.hideOnScroll: true` and retain `nav` in
`runtime`. The config validator rejects that option without its runtime. See
[Site configuration](https://jamshoot-apps.github.io/jamshoot-design/configuration.html).

## Composition

The `brand` slot normally receives `brand({ compact: true })`; `theme` may receive
`themeToggle()`. Header-owned wrappers position them without selecting their private
elements. Include `theme` in the site's runtime when supplying the theme control.
The template derives its choices from the site's palette files. Use one header per
document: the mobile disclosure controls the navigation id `ds-nav`.
