# Plan

<!-- docs-review: 408a79407932; reason: Reviewed subtitle to lead as inline markup, ds-plan__lead class and trusted-input note -->

One pricing tier with a price, feature list and optional link. Arrange tiers with
[Grid](../../layout/grid/README.md); use `featured` for the tier you recommend.

## Usage

```example title="Plain and featured tiers"
grid({ content: [
  plan({ title: 'Free', price: { amount: '$0' }, features: ['One project'] }),
  plan({
    title: 'Pro',
    price: { amount: '$29', note: 'One-time purchase' },
    lead: 'For larger projects.',
    features: ['Unlimited tasks', 'Export project notes'],
    featured: true,
    badgeLabel: 'Best value',
    link: { label: 'Read the terms', href: '#terms' },
  }),
] })
```

```example title="Discounted tier"
plan({
  title: 'Pro',
  price: { amount: '$9.99', previous: '$14.99', note: 'One-time purchase' },
  features: ['Create projects without limits'],
  featured: true,
})
```

The displayed price and its qualifiers are inside `price`. `amount` stays prominent and
`previous` sits beside it, smaller, muted and struck through, wrapping when there is
no room; `previousLabel` is the screen-reader label for it, because a strikethrough
alone may not be announced. A tier with no `previous` is an ordinary tier.

Prices are display text. The component calculates no discount and adds no sale badge
or expiry date — what the store charges is what the store says.

```options plan
| Option | Accepts |  | What it is |
| --- | --- | --- | --- |
| `title` | `string` | required | What the tier is called. |
| `price` | `{ amount, previous, previousLabel, note }` | required | The displayed price and its qualifiers. |
| `price.amount` | `string` | required | The price as display text, including its currency. |
| `price.previous` | `string` | optional | The former price, smaller and struck through beside the current one. |
| `price.previousLabel` | `string` | default `Previous price` | Screen-reader label for the former price, because a strikethrough alone may not be announced. |
| `price.note` | `string (inline HTML allowed)` | optional | A small qualifier directly below the price. May carry an inline link. |
| `lead` | `string (inline HTML allowed)` | optional | One line explaining what the tier is for. May carry an inline link. |
| `features` | `non-empty array of strings` | required | What the tier includes, one line each. |
| `featured` | `true or false` | default `false` | Visually marks a recommended tier. Use at most one per comparison; build and lint do not check this across plans. |
| `badgeLabel` | `string` | optional | A word on the tier — "Popular", "Free". Drawn as a badge(). |
| `link` | `{ label, href }` | optional | An optional text link at the bottom of the tier. |
| `link.label` | `string` | required | What the link says. |
| `link.href` | `string` | required | Where it goes. |
```

## Composition

As an authoring convention, feature at most one tier in a comparison. Build and lint
do not check this across separate `plan()` calls. Two or three tiers are a common
arrangement, not a limit enforced by Grid or Plan.

The badge and icons sit in plan-owned wrappers. Omitting `badgeLabel`, `price.note`,
`lead` or `link` leaves no empty row.

`lead` is inline markup and is not escaped: pass trusted text only. Markup options are
not sanitizers.

For setup and the build/lint workflow, see [Authoring a site](https://jamshoot-apps.github.io/jamshoot-design/authoring.html).
For alternatives, see [Choosing molecules](https://jamshoot-apps.github.io/jamshoot-design/molecules.html).
