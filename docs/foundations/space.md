# Space, radius and motion

The library defines the shared spacing, radius and motion scales. Sites use these
values without redefining the primitives. Some components expose component tokens that
select from those scales; see [Component tokens](../theming.md#component-tokens).

## Spacing

Every margin, padding and gap on every site comes from this scale. A number somebody
eyeballed fails the lint — see [Rules](../anti-patterns.md), under `scale`.

The scale uses a `0.25rem` module: `4px` at a root font size of `16px`. Every step
is a multiple of that module, with larger intervals toward the end of the scale.
CSS stores the values in `rem`; the pixel equivalents below assume a `16px` root
font size and change when that size changes.

| Token | rem | px at a 16px root |
| --- | --- | --- |
| `--ds-space-3xs` | `0.25rem` | `4px` |
| `--ds-space-2xs` | `0.5rem` | `8px` |
| `--ds-space-xs` | `0.75rem` | `12px` |
| `--ds-space-sm` | `1rem` | `16px` |
| `--ds-space-md` | `1.25rem` | `20px` |
| `--ds-space-lg` | `1.5rem` | `24px` |
| `--ds-space-xl` | `2rem` | `32px` |
| `--ds-space-2xl` | `2.5rem` | `40px` |
| `--ds-space-3xl` | `3.5rem` | `56px` |
| `--ds-space-4xl` | `5rem` | `80px` |
| `--ds-space-5xl` | `7rem` | `112px` |

```example title="The scale"
h('div', {}, ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'].map((step) =>
  h('div', { class: 'ruler' }, [
    h('code', { text: `--ds-space-${step}` }),
    h('span', { class: 'ruler__bar', style: `width: var(--ds-space-${step})` }),
  ])))
```

`--ds-gutter` and `--ds-section-space` are the two that change at 52 rem: the page
gutter goes from `md` to `xl`, and the space above and below a section from `4xl` to
`5xl`. Components may change which spacing tokens they use at a breakpoint; for
example, Header changes its navigation gap and padding at 52rem.

## Radius

Four steps. Bands, rules and dividers have square corners. Cards, image frames and
table scroll wrappers use the radius defined by their component styles. Table cells
remain square.

```example title="Radii"
h('div', { class: 'swatches' }, ['sm', 'md', 'lg', 'pill'].map((step) =>
  h('div', { class: 'swatch swatch--tall',
    style: `border: 1px solid var(--ds-border-strong); border-radius: var(--ds-radius-${step})` },
    h('code', { text: `--ds-radius-${step}` }))))
```

| Token | Value | For |
| --- | --- | --- |
| `--ds-radius-sm` | `10px` | Small surfaces and code blocks |
| `--ds-radius-md` | `16px` | Cards, image frames, table scroll wrappers |
| `--ds-radius-lg` | `22px` | The largest panels |
| `--ds-radius-pill` | `999px` | Buttons and badges |

These are the shared steps and their default uses. Supported component tokens can
change button, card and figure corners. Focus outlines follow the element's shape;
they do not have a separate radius token.

## Motion

Page content uses hover, focus and state feedback. Scroll-driven content animation
is refused by lint. The documented exception is the optional Header hide/reveal in
`src/runtime/nav.js`; see `scroll-animation` in [Rules](../anti-patterns.md).

| Token | Value |
| --- | --- |
| `--ds-motion-quick` | `160ms` — color and border feedback |
| `--ds-motion-settle` | `320ms` — something arriving or leaving |
| `--ds-ease-out` | `cubic-bezier(0.22, 0.61, 0.36, 1)` |

Any stylesheet that declares a `transition` or an `animation` must also declare what
happens under `prefers-reduced-motion: reduce`. The global reset stops things moving;
a component whose *resting* state needs to differ has to say so itself.

## Layout

| Token | Value |
| --- | --- |
| `--ds-content-max` | `1120px` |
| `--ds-content-narrow` | `720px` — prose, legal documents, section heads |
| `--ds-tap-target` | `44px` — the system's default touch-target size |
| `--ds-control-height` | `50px` at a `16px` root font size — calculated from a one-line button's text, padding and borders; aligns an adjacent store badge |
| `--ds-icon-size` | `1.5rem`, overridden by whatever contains the icon |

The `tap-target` lint rule checks the primitive's declared value, with a minimum of
24px. It does not measure every rendered interactive target; check their sizes in
the browser. See [Rules](../anti-patterns.md#tap-target-a-tap-target-under-the-standard).

Breakpoints are **34rem**, **52rem** and **64rem**, mobile first. Layout targets in
priority order: tablet (1024 px), phone (390 px), desktop (1440 px).
