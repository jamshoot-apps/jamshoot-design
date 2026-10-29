# Theme toggle

<!-- docs-review: cb53a05857ca; reason: Reviewed CSS comment spelling only; control contract unchanged -->

A button that cycles through a site's palettes, one per click. One state can follow
the operating system instead of selecting a palette.

For template-rendered sites, enable `theme.toggle` in `site.config.js`, include
`theme` in `runtime`, and provide at least two palettes. The template derives the
choices from the palette files and supplies the control to Header. Follow
[Theming](https://jamshoot-apps.github.io/jamshoot-design/theming.html) for the configuration and palette setup.

## Usage

This is a static markup preview. The documentation's `theme` runtime connects to
the first theme control in the document, in the documentation header; the control
below does not cycle. Use only one theme control per document.

Import `themeToggle` from `@jamshoot-apps/design` when composing a custom control;
see [example context](https://jamshoot-apps.github.io/jamshoot-design/authoring.html#component-example-context).
For standalone integration, the palette values must match actual site palettes
and the document must load the `theme` runtime. Calling this atom does not create palettes.

```example title="Theme control markup — static preview"
themeToggle({
  label: 'Theme',
  choices: [
    { label: 'Auto', icon: 'contrast-outline' },
    { palette: 'default', label: 'Light', icon: 'sunny-outline' },
    { palette: 'dark', label: 'Dark', icon: 'moon-outline' },
  ],
})
```

```options themeToggle
| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `label` | `string` | default `Theme` | What the control is called, read before the state it is in. |
| `action` | `string` | default `Switch to` | Read after the state, with the next palette’s name after it: what one click does. |
| `choices` | `non-empty array of { palette, label, icon }` | required | The states, in the order one click moves through them. |
| `choices[].palette` | `string` | optional | The palette this choice selects. Leave it out for the choice that follows the operating system. |
| `choices[].label` | `string` | required | What the control calls this state. |
| `choices[].icon` | `icon name` | required | What it shows while in it. |
```

Every state is in the markup. The current one carries `data-active`; the others are
hidden, so only the current state is drawn and included in the button's accessible
name.

That name gives the state and the next one: `Theme: Auto. Switch to Light.` becomes
`Theme: Light. Switch to Dark.` after a click. The state alone is ambiguous to a reader
who cannot see the icon: `Theme: Dark` could be the current theme or the one a click
would apply. The component takes the next state from the `choices` order, so a site
does not list it separately. Change `action` to translate the phrase.

A choice without `palette` follows the operating system. Selecting it clears the
stored choice and removes `data-theme`. Put it first so the initial markup and
fallback state use it. The runtime restores a saved choice when that choice is
still available; otherwise it selects the first choice.

## Composition

The example uses built-in theme icons and needs no `JAMSHOOT_ICONS_DIR` setting.
Custom choice icons come from a trusted SVG directory configured through
`JAMSHOOT_ICONS_DIR`; see the [icon guide](https://jamshoot-apps.github.io/jamshoot-design/foundations-icons.html).
Names are validated when rendering, including nested choices.

For template-rendered sites, each palette file can set its own label and icon with
`--ds-theme-label` and `--ds-theme-icon`, so adding a palette file adds a state without
editing this component. See [Theming](https://jamshoot-apps.github.io/jamshoot-design/theming.html) for defaults.

`src/runtime/theme.js` changes the state on click. It reads the options from this markup:
each option's value is set on `<html>` as `data-theme`, and the empty value removes
the attribute. Without the runtime the button does nothing, so the site config rejects
`theme.toggle` unless `runtime` lists `theme`.

## For library maintainers

`src/themes.js` reads the palette files and the template passes the derived choices
to Header's `theme` slot. Two base rules supply the rest: `.ds-icon-button` gives the shape, shared with the menu
button beside it in the header, and `.ds-visually-hidden` clips the state label. The
local stylesheet only decides which state is drawn.
