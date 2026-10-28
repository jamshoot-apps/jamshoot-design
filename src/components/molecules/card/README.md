# Card

<!-- docs-review: f6adcbe2ffda; reason: Reviewed the media slot contract, executable Figure composition and site block recipe; updated the catalog summary. -->

A bordered panel for related content: a title with supporting text or a bullet list,
plus an optional icon or media slot.

## Usage

These icons are built in; this example needs no `JAMSHOOT_ICONS_DIR` setting.

```example title="Icon cards"
grid({ cell: 'md', content: [
  card({ icon: 'checkmark', title: 'Final version', body: 'Saved as final-final-v3.' }),
  card({ icon: 'arrow-forward', title: 'One small change', body: 'Move it one spacing token to the right.' }),
] })
```

```example title="A list instead of body copy"
card({ title: 'Project tools', bullets: ['Notes', 'Tasks', 'Checklists'] })
```

```options card
| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `title` | `string` | required | The claim, as a short sentence. |
| `body` | `string (inline HTML allowed)` | optional | One or two sentences supporting it. Use this or `bullets`, not both. |
| `bullets` | `non-empty array of strings` | optional | A bullet list instead of a paragraph — formats, requirements, what is included. |
| `icon` | `icon name` | optional | An icon name, shown on a tile above the title. |
| `media` | `component call, string, or array of them` | optional | Renderable content in the card-owned edge-to-edge media slot. |

Takes:

- at most one of `body` or `bullets` — a card says one thing
```

## Composition

A card requires a `title`. Choose either `body` or `bullets` for supporting content,
or omit both for a short label. Arrange several cards with [Grid](../../layout/grid/README.md).

The `icon` option uses a built-in icon name or an SVG from the trusted directory
selected through `JAMSHOOT_ICONS_DIR`; see the [icon guide](https://jamshoot-apps.github.io/jamshoot-design/foundations-icons.html).
Cards without an icon need no icon files.

### Add a figure through media

Card accepts the rendered output of [Figure](../figure/README.md) through `media`.
Combine them in an organism or a site block. For a site, save this renderer as
`blocks/screenshot-card.js`, import it in `pages.js`, and pass content from `content/`:

```js file="blocks/screenshot-card.js"
import { card, figure } from '@jamshoot-apps/design';

export function screenshotCard({ title, body, image }) {
  return card({ title, body, media: figure(image) });
}
```

See the [rendered composition example](https://jamshoot-apps.github.io/jamshoot-design/molecules.html#compose-a-figure-in-a-card).
It uses a placeholder, so it needs no image asset.

The dependency rule applies to library implementations: Card and Figure do not
import each other. It does not prohibit passing Figure's output to `card.media`.
See [Component layers](https://jamshoot-apps.github.io/jamshoot-design/architecture.html#component-layers).

Card owns the edge-to-edge media slot, clips it to the top corners and supplies its
spacing. Figure owns its frame and caption. Add no margin to the media slot and do
not select either component's private elements. Card composes its icon with
[Icon tile](../../atoms/iconTile/README.md).

For setup and the build/lint workflow, see [Authoring a site](https://jamshoot-apps.github.io/jamshoot-design/authoring.html).
For alternatives, see [Choosing molecules](https://jamshoot-apps.github.io/jamshoot-design/molecules.html).
