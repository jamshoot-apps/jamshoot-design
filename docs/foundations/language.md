# Language

Almost every word on a JamShoot site comes from the site: `content/*.js`, the strings
in `site.config.js`, the copy a page passes to a component. That is the whole point of
the content boundary — a component takes words; it does not keep any.

Almost. There is a short list of strings the library has to put in the markup itself,
because they are the name of a control rather than something a page is about: the menu
button, the skip link, the theme control's state and action, what an empty screenshot
frame says while the screenshot does not exist.

Each of those is an option with a default, and each default is English.

## What a site in another language sets

Set `lang` in `site.config.js`, then translate the interface strings used by the
site. Setting `lang: 'de'` alone leaves the skip link saying "Skip to main content".

For the site header and theme control, use the `site.config.js` fields below. When
rendering a component directly, pass its translated options at that call site. The
table lists both paths; a site does not need to configure components it does not use.

The list is generated from the option declarations. When a component gains a string,
`npm test` fails until `npm run tables` adds it to this page.

```strings all
| Where | Option | English |
| --- | --- | --- |
| `site.config.js` | `lang` | `en` |
| `site.config.js` | `nav.label` | `Primary` |
| `site.config.js` | `nav.toggleLabel` | `Toggle navigation` |
| `site.config.js` | `skipLink` | `Skip to main content` |
| `site.config.js` | `theme.label` | `Theme` |
| `site.config.js` | `theme.auto` | `Auto` |
| `site.config.js` | `theme.action` | `Switch to` |
| `navToggle()` | `label` | `Toggle navigation` |
| `themeToggle()` | `label` | `Theme` |
| `themeToggle()` | `action` | `Switch to` |
| `figure()` | `label` | `Screenshot pending` |
| `plan()` | `price.previousLabel` | `Previous price` |
| `header()` | `label` | `Primary` |
| `header()` | `toggleLabel` | `Toggle navigation` |
```

Two of these read as a sentence together — the theme control's accessible name is
`label`, the state, then `action` and the name of the next palette: *Theme: Dark.
Switch to Auto.* Translate `label`, `action` and the state names to fit this order.
The component fixes the order and punctuation; changing `action` does not move the
next palette's name or provide a configurable sentence template.

A palette's own name is not here, because it is not the library's: it comes from
`--ds-theme-label` in the palette file, and falls back to the capitalised file name.
See [Theming](../theming.md).

## What is not translated

Changing `lang` does not translate content, format dates, apply plural rules or
select a different font. Supply translated copy and configure any required font
files separately; see [Typography](type.md). Review long translated
labels and the chosen font in the rendered layout before launch.
