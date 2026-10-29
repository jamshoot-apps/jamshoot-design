# Changelog

## [Unreleased]

## [2.0.0] — 2026-10-29

### Changed

- Documentation, messages and identifiers use American English. The lint rule
  `theme-colour` is now `theme-color`, the allow directive `ds-allow: colour` is
  `ds-allow: color`, and `knob-assignment` is `token-assignment`. The color guide
  moved from `foundations/colour` to `foundations/color`.
- Renamed options for consistent naming. Update sites and site blocks:
  - `site.config.js`: `footer.columns` is `footer.groups`; `nav.homeHref` is
    `brand.href`.
  - `iconTile`: `name` is `icon`.
  - `section`: the `surface` value `plain` is `default`.
  - `brand`: the `position` value `right` is `end`.
  - `plan`: `subtitle` is `lead`, which is inline markup and no longer escaped
    (pass trusted text only); the element class
    `ds-plan__subtitle` is `ds-plan__lead`.
  - `badge`: `tone` is `variant`.
  - `proof`: `style` is `layout`.
  - `figure`: `label` is `placeholder`.
  - `pageHeader`: `meta` is `byline`; the element class `ds-page-header__meta` is
    `ds-page-header__byline`.

## [1.0.0] — 2026-10-28

Initial public release of `@jamshoot-apps/design`, a dependency-free design system
and static site toolkit for Node.js 22 or newer.

- Build-time HTML components for layout, navigation, content, pricing, headers and
  footers, with validated options and public markup helpers for custom blocks.
- Shared CSS, twelve semantic colour roles, light and dark starter palettes,
  built-in SVG icons and optional browser behaviour, including theme switching.
- Static site builds with page metadata, content-hashed browser scripts and assets.
  Successful builds replace the output; failed builds preserve the previous build.
- CLI tools for building sites, local development with live reload, source and
  output linting, and Open Graph image generation.
- Component API references, executable examples, site authoring guides and a
  self-contained test site.
- Apache 2.0 licensing for code and documentation, with separate notices for
  Ionicons and JamShoot brand artwork.
