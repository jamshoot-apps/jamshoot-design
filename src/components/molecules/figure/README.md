# Figure

<!-- docs-review: 3e2bd6f3d4bf; reason: Corrected alt, responsive source and loading explanations; checked placeholder, assets and Card media composition against renderer and CSS. -->

A framed product image with an optional caption. Omit `src` to show a labelled
placeholder. The placeholder is not a fallback for an image that fails to load.

## Usage

The image below is included in this documentation build. In a site, put your image
under `assets/` and use its site-relative URL, such as `assets/viewer.png`; see
[site assets](https://jamshoot-apps.github.io/jamshoot-design/authoring.html#what-ships).

```example title="Placeholder and priority image"
stack({ content: [
  figure({ label: 'Screenshot pending', caption: 'The layout is ready. The screenshot is on its way.' }),
  figure({
    src: 'brand/example.svg',
    alt: 'Example project mark',
    width: 64,
    height: 64,
    priority: true,
    caption: 'Loaded eagerly for a hero',
  }),
] })
```

```options figure
| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `src` | `string` | optional | The image. Omit it and the frame stays empty and labelled. |
| `srcset` | `string` | optional | Image candidates with width (`w`) descriptors. Supply `sizes` with them. |
| `sizes` | `string` | optional | The rendered width used for candidate selection. Required with `srcset`. |
| `alt` | `string` | optional | The image’s purpose or relevant information. Required with `src`; use `""` for a decorative image. |
| `width` | `number` | optional | Intrinsic width in pixels. Supply with `height` to provide the aspect ratio. |
| `height` | `number` | optional | Intrinsic height in pixels. Supply with `width`. |
| `caption` | `string` | optional | A line under the frame. |
| `label` | `string` | default `Screenshot pending` | What the empty frame says while the screenshot does not exist. |
| `priority` | `true or false` | default `false` | Use for a critical hero image. Sets `loading="eager"` and `fetchpriority="high"`; otherwise the image loads lazily. |

Takes:

- `alt` whenever `src` is set — provide a text alternative, or an explicit empty string for a decorative image
- `sizes` whenever `srcset` is set — declare the rendered width for width-based image candidates
- `width` and `height` together — provide the intrinsic aspect ratio with both dimensions
```

## Composition

When `src` is set, supply `alt` describing the image's purpose or relevant content.
Use an explicit empty string for a decorative image.

For responsive sources, use width (`w`) descriptors in `srcset` and describe the
rendered width in `sizes`. Figure requires `sizes` whenever `srcset` is supplied.
The browser chooses a candidate using this width, pixel density and other factors;
omitting `sizes` is not a guarantee that it would choose the largest file.

Supply `width` and `height` together to provide the intrinsic aspect ratio. These
dimensions help the browser reserve space before loading; CSS controls the rendered
width. Figure requires both dimensions if either is supplied.

Set `priority: true` for a critical hero image. This sets `loading="eager"` and
`fetchpriority="high"`; other images use `loading="lazy"`. These attributes do not
guarantee an LCP result. Check loading and layout in the finished page.

Figure owns the same frame and caption in every context. A parent may place or clip
the Figure through its own wrapper, but does not alter Figure's internal elements.
To show a figure in a card, pass its rendered output to `card.media` from an organism
or site block; [Card's media example](../card/README.md#add-a-figure-through-media)
shows the code. The library dependency rule prevents Card and Figure from importing
each other; it permits this composition by their caller.

For setup and the build/lint workflow, see [Authoring a site](https://jamshoot-apps.github.io/jamshoot-design/authoring.html).
For alternatives, see [Choosing molecules](https://jamshoot-apps.github.io/jamshoot-design/molecules.html).
