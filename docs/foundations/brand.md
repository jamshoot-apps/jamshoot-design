# Brand assets

Configure the site header's logo through `brand.logo` in
[`site.config.js`](../configuration.md#site-identity). Store site artwork under
`assets/` so the build copies it with the site. A visible name can stand alone when
the site has no logo.

[`brand()`](../../src/components/atoms/brand/README.md) combines the logo, name and
optional tagline. Use it directly when another part of the page needs a lockup.
Its image reserves a square aspect ratio. Use artwork with a square
canvas; choose a text-only lockup or a site block for a different composition.

`compact: true` reduces the logo size and hides the tagline below the component's
breakpoint. The Header component uses that option. A parent places the lockup through
its own wrapper; the Brand stylesheet owns the image and text styling.

The examples use `docs/assets/brand/example.svg`, a neutral sample mark under Apache 2.0.
The documentation header uses `docs/assets/brand/jamshoot/logo.svg`. That JamShoot artwork
has separate brand-asset terms in `docs/assets/brand/jamshoot/LICENSE.txt` and is
excluded from Apache 2.0; it is not a starter logo for sites. Documentation
builds copy the logo and its terms together into `brand/jamshoot/`.

## Examples

```example title="Logo with a name and tagline"
brand({ logo: 'brand/example.svg', text: 'Example', tagline: 'Project workspace' })
```

```example title="Name below the logo"
brand({ logo: 'brand/example.svg', text: 'Example', position: 'bottom' })
```

```example title="Compact lockup for a header"
brand({ logo: 'brand/example.svg', text: 'Example', tagline: 'Project workspace', compact: true, href: '#' })
```

```example title="A visible name without a logo"
brand({ text: 'Example', tagline: 'Project workspace' })
```

Choose files that remain legible against the site's palettes and follow the asset
owner's usage and licensing terms. The library does not prescribe a site's logo,
wordmark, clear-space rules or trademark policy.
