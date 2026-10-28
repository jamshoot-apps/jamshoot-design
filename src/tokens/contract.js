/**
 * The contract — the one place that says what this design system promises.
 *
 * Token *values* live in CSS, where a human can read and tune them. Token *names and
 * rules* live here, where a machine can check them. `src/cli/lint.mjs` and `scripts/docs.mjs`
 * both read this file, and `test/contracts/tokens.test.mjs` fails if the CSS and this file
 * ever disagree — which is what stops the list drifting into three copies again.
 *
 * Three tiers, the shape the field settled on (primitive → semantic → component):
 *
 *   L1 primitives   fixed scales — space, type, radius, motion, layout.
 *                   A project never touches these. They are what makes two sites
 *                   with unrelated palettes still read as the same hand.
 *
 *   L2 roles        the twelve semantic colours plus color-scheme. A project sets
 *                   all twelve, and nothing else. Checked for contrast, not trusted.
 *
 *   L3 component    optional, whitelisted knobs a project may turn when a role is
 *                   not enough — a squarer button, a flatter card. Every one falls
 *                   back to a primitive or a role, so setting none is the house style.
 *
 * Adding a name here is a deliberate widening of the contract. Adding one anywhere
 * else fails the build.
 */

/* --- L2: the colour roles ------------------------------------------------------ */

/**
 * A project sets exactly these, in theme.css. `on` names the surface a role is
 * measured against; `min` is the ratio it has to clear, from WCAG 2.2:
 *
 *   4.5  body text                       (1.4.3 Contrast (Minimum), AA)
 *   3    UI that carries meaning without being text — the focus ring, a strong
 *        hairline, the accent used as a mark  (1.4.11 Non-text Contrast, AA)
 *
 * The accent also colours ordinary links, so both of its steps clear the 4.5 text
 * threshold as well as the weaker 3:1 requirement for marks and focus rings. Text
 * placed on the accent is checked over both the resting and interactive fills.
 */
export const ROLES = [
  { name: 'bg', kind: 'surface', summary: 'The page itself.' },
  { name: 'surface', kind: 'surface', summary: 'A card, a panel, anything sitting on the page.' },
  { name: 'surface-raised', kind: 'surface', summary: 'A surface on top of a surface: an icon tile, an open menu.' },
  { name: 'surface-sunken', kind: 'surface', summary: 'An alternating band, a code block, an empty frame.' },

  { name: 'text', kind: 'text', on: 'surfaces', min: 4.5, summary: 'Headings and key content.' },
  { name: 'text-muted', kind: 'text', on: 'surfaces', min: 4.5, summary: 'Body copy inside a component.' },
  { name: 'text-faint', kind: 'text', on: 'surfaces', min: 4.5, summary: 'Eyebrows, captions, footnotes.' },

  { name: 'accent', kind: 'mark', on: 'surfaces', min: 4.5, summary: 'Primary actions, accent links and focus.' },
  { name: 'accent-strong', kind: 'mark', on: 'surfaces', min: 4.5, summary: 'Its hover and active step.' },
  { name: 'on-accent', kind: 'text', on: ['accent', 'accent-strong'], min: 4.5, summary: 'Text placed on either accent step.' },

  { name: 'border', kind: 'line', summary: 'Decorative dividers and card edges.' },
  { name: 'border-strong', kind: 'line', on: 'surfaces', min: 3, summary: 'Visible boundaries that identify controls.' },
];

export const ROLE_NAMES = ROLES.map((role) => role.name);

export const SURFACE_ROLES = ROLES.filter((role) => role.kind === 'surface').map((role) => role.name);

/** Native controls and scrollbars follow this, so it is part of the contract. */
export const COLOR_SCHEMES = ['dark', 'light'];

/* --- L2, continued: more than one palette -------------------------------------- */

/**
 * A palette is a file, and the set of them is a directory.
 *
 *   theme.css            the palette every reader starts from. Sets all twelve roles.
 *   themes/<name>.css    another palette, named by its file. Sets only what differs.
 *
 * Nothing registers a theme: `src/themes.js` reads the directory, and the build turns
 * each file into the selector that switches it on. A site adds a theme by adding a
 * file, and takes one away by deleting it — there is no list of themes to update in
 * the library, in the config, or in this file.
 *
 * Two names mean something. A theme called `light` or `dark` is what `auto` resolves
 * to when the operating system asks for that scheme; any other name is a palette a
 * reader can choose but the system never picks on its own. The base palette covers
 * the scheme it declares, so the usual pair is `theme.css` plus one file.
 */
export const THEME_DIRECTORY = 'themes';

/** The base palette, and what `data-theme` calls it when a reader picks it outright. */
export const BASE_THEME = { file: 'theme.css', name: 'default' };

/**
 * The control's own state, and the one every page starts in: follow the system, with
 * nothing stored and no attribute set. It is the absence of a palette rather than one
 * of them, which is why it has no name here — only the icon that stands for it.
 */
export const AUTO_CHOICE = { icon: 'contrast-outline' };

/** A theme name is a file name. The reserved base name is not available to a file. */
export const THEME_NAME = /^[a-z][a-z0-9-]*$/;

/**
 * The attribute a reader's choice is written as, and where it survives a reload.
 *
 * These two strings are the whole interface between the generated CSS, the page head
 * and `src/runtime/theme.js`. The runtime cannot import this file — it runs in a browser
 * — so it is the one place they are spelled out a second time, and
 * `src/components/atoms/themeToggle/themeToggle.test.mjs` fails if the two disagree.
 */
export const THEME_ATTRIBUTE = 'data-theme';
export const THEME_STORAGE_KEY = 'ds-theme';

/**
 * What a palette file may say about itself besides colour, for the control that
 * offers it. Both are optional and both have an answer without being set, so a site
 * that only wants two palettes writes neither.
 */
export const THEME_METADATA = {
  label: {
    token: 'theme-label',
    summary: 'What the control calls this palette, and what a screen reader says.',
    fallback: 'The capitalised file name.',
  },
  icon: {
    token: 'theme-icon',
    summary: 'The icon the control shows while in that state.',
    fallback: 'The icon for its `color-scheme`.',
  },
};

export const THEME_METADATA_TOKENS = Object.values(THEME_METADATA).map((entry) => entry.token);

/** The icon a palette gets from its scheme when it does not name one. */
export const SCHEME_ICONS = { light: 'sunny-outline', dark: 'moon-outline' };

/**
 * The three widths the system changes layout at, mobile-first.
 *
 * They are declared here rather than as tokens because a media query cannot read a
 * custom property — the one place in the system where a raw value has to be typed.
 * The lint checks every `@media` in every stylesheet against this list, so "typed by
 * hand" still does not mean "chosen by hand".
 */
export const BREAKPOINTS = ['34rem', '52rem', '64rem'];

/* --- L1: the fixed scales ------------------------------------------------------ */

/**
 * Declared here by name and shape so the lint can prove the CSS still defines them
 * and that nothing outside src/tokens/ invents a thirteenth step. Values stay in
 * src/tokens/primitives.css.
 */
export const PRIMITIVES = {
  space: ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'],
  radius: ['sm', 'md', 'lg', 'pill'],
  text: ['display', 'title', 'subtitle', 'body', 'small', 'caption', 'micro', 'code'],
  weight: ['regular', 'medium', 'semibold', 'bold'],
  leading: ['tight', 'snug', 'body'],
  tracking: ['tight', 'wide'],
  motion: ['quick', 'settle'],
  ease: ['out'],
  font: ['sans', 'display', 'mono'],

  /** How large a glyph is drawn in the three places an icon appears. */
  icon: ['sm', 'md', 'lg'],

  /**
   * How wide a column of something gets: a grid cell before the grid drops one, a
   * line of body copy, a screenshot frame before it stops being a screenshot. Every
   * `max-width`, `min-width` and `min-height` in the system reads one of these, so a
   * width is a step on a scale rather than a number somebody eyeballed.
   */
  measure: ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'],
};

/**
 * A named, curated subset of the space scale — for a `gap` option that only makes
 * sense at some steps (a cluster has no use for `3xs`; a grid never wants `xl`).
 * Throws at import time if a name here no longer matches `PRIMITIVES.space`, so a
 * step renamed in the scale and forgotten in a component fails loudly instead of
 * quietly leaving an option value with no primitive behind it.
 */
export function spaceSteps(...names) {
  return steps('space', names);
}

/** The same, for an option that picks a width — how narrow a grid cell may get. */
export function measureSteps(...names) {
  return steps('measure', names);
}

function steps(group, names) {
  const unknown = names.filter((name) => !PRIMITIVES[group].includes(name));

  if (unknown.length) {
    throw new Error(`${group}Steps(): ${unknown.join(', ')} is not on PRIMITIVES.${group} — rename it here too`);
  }

  return names;
}

/** Single-value primitives, named in full because they have no scale. */
export const LAYOUT_PRIMITIVES = [
  'content-max',
  'content-narrow',
  'gutter',
  'header-height',
  'section-space',
  'icon-size',
  'icon-tile',
  'tap-target',
  'control-height',

  /*
   * Stacking order: the chrome, and the keyboard's route past the chrome. Every
   * `z-index` in the system reads one of these, so "above" is a step on a scale
   * rather than a number raised until it worked.
   */
  'layer-chrome',
  'layer-top',

  /* The one width every boundary in the system is drawn with, and the focus ring. */
  'hairline',
  'focus-ring',
  'focus-offset',

  /* Type-relative nudges: they scale with the text they sit in, so they are `em`. */
  'underline-offset',
  'align-nudge',
];

/**
 * WCAG 2.2 §2.5.8 Target Size (Minimum) asks for 24 CSS px. The system uses 44, the
 * Apple HIG figure, because a landing page is read on a phone held in one hand.
 *
 * `--ds-tap-target` is a primitive, not a knob: a project cannot set it (`theme-contract`), so
 * this floor exists to stop the library itself regressing — a tightened button, an
 * icon-only control sized to its glyph.
 */
export const MIN_TAP_TARGET_PX = 24;

/* --- L3: the component knobs --------------------------------------------------- */

const primitiveValues = (group) => PRIMITIVES[group].map((step) => `var(--ds-${group}-${step})`);
const surfaceValues = SURFACE_ROLES.map((name) => `var(--ds-${name})`);

const RADIUS = { values: ['0', ...primitiveValues('radius')], summary: 'zero or a `--ds-radius-*` token' };
const WEIGHT = { values: primitiveValues('weight'), summary: 'a `--ds-weight-*` token' };
const SPACE = { values: primitiveValues('space'), summary: 'a `--ds-space-*` token' };
const SURFACE = { values: ['transparent', ...surfaceValues], summary: '`transparent` or a surface colour role' };
const MEASURE = { values: primitiveValues('measure'), summary: 'a `--ds-measure-*` token' };
const LENGTH = {
  values: primitiveValues('measure'),
  pattern: /^(?:0|\d*\.?\d+(?:px|rem|em|vh|vw|vmin|vmax|svh|svw|lvh|lvw|dvh|dvw))$/,
  summary: 'a `--ds-measure-*` token or CSS length',
};
const TRACK_RATIO = {
  pattern: /^(?:[1-9]\d*(?:\.\d+)?|0?\.\d*[1-9]\d*)fr\s+(?:[1-9]\d*(?:\.\d+)?|0?\.\d*[1-9]\d*)fr$/,
  summary: 'two `fr` tracks, for example `2fr 1fr`',
};

/**
 * The escape hatch, deliberately narrow. A project may set any of these in theme.css;
 * each one falls back to a primitive or a role, so a project that sets none of them
 * gets the house style. Anything not on this list is not a knob, and the lint says so.
 *
 * `fallback` is checked against the CSS: the declaration that reads the token has to
 * supply exactly this default, so the documented behaviour and the stylesheet cannot
 * drift apart. `accepts` constrains project values to the same scales and roles the
 * library uses. `variants` names the other defaults the same knob is read with, one
 * per modifier — a wide grid starts wider — and the knob still wins over all of them.
 *
 * What is deliberately *not* here: the spacing between children of a stack, a cluster
 * or a grid. That is the `gap` option, chosen per call from the fixed scale. A project
 * token for it would have to win over every modifier, which would flatten seven
 * declared steps into one — a knob that quietly deletes the scale is worse than none.
 */
export const COMPONENT_TOKENS = [
  { name: 'button-radius', fallback: '--ds-radius-pill', accepts: RADIUS, summary: 'Corner of a button. Tighten it for a flatter brand.' },
  { name: 'button-weight', fallback: '--ds-weight-medium', accepts: WEIGHT, summary: 'Label weight on a button.' },

  { name: 'card-radius', fallback: '--ds-radius-md', accepts: RADIUS, summary: 'Corner of a card.' },
  { name: 'card-padding', fallback: '--ds-space-lg', accepts: SPACE, summary: 'Inset of a card.' },
  { name: 'card-surface', fallback: '--ds-surface', accepts: SURFACE, summary: 'Card fill, when it should not be the default surface.' },

  { name: 'figure-radius', fallback: '--ds-radius-md', accepts: RADIUS, summary: 'Corner of a screenshot frame.' },

  {
    name: 'hero-visual-height',
    fallback: '--ds-measure-md',
    accepts: LENGTH,
    summary: 'How much room the hero reserves for the project’s own visual. Set it from the block that fills it.',
  },

  {
    name: 'grid-min',
    fallback: '--ds-measure-xs',
    accepts: MEASURE,
    variants: ['--ds-measure-md'],
    summary: 'Narrowest a grid column gets before the grid drops a column.',
  },
  { name: 'split-columns', fallback: '1fr 1fr', accepts: TRACK_RATIO, summary: 'Column ratio of a two-up split.' },
];

export const COMPONENT_TOKEN_NAMES = COMPONENT_TOKENS.map((token) => token.name);

/** Everything a site's palette files are allowed to name. */
export const THEMEABLE = [...ROLE_NAMES, ...COMPONENT_TOKEN_NAMES, ...THEME_METADATA_TOKENS];

/*
 * A library stylesheet reads a knob and never assigns one — `knob-assignment`. A modifier that
 * needs its own default assigns a private variable instead, and the knob is read into
 * that variable:
 *
 *   .ds-grid        { --_grid-min: var(--ds-grid-min, var(--ds-measure-xs)); }
 *   .ds-grid--cell-md { --_grid-min: var(--ds-grid-min, var(--ds-measure-md)); }
 *
 * Written the other way round — the modifier assigning `--ds-grid-min` — the project's
 * own value would be overwritten on every variant, which is the failure this prefix
 * exists to make visible.
 */

/* --- the cascade --------------------------------------------------------------- */

/**
 * Layer order, low to high. The build wraps every stylesheet it concatenates in one
 * of these, so override order is declared once here instead of being an accident of
 * the order files happen to be listed in — and a project never has to out-specify a
 * library selector to change something.
 *
 * Site authors write no `@layer` themselves: blocks/*.css is wrapped in `site.blocks`
 * on the way into the bundle.
 *
 * One hazard this has to respect: unlayered CSS beats every layer. Everything the
 * build emits is therefore layered, with no exceptions — and every layer named here
 * has something that fills it, because a declared layer nothing writes into is an
 * open door the docs cannot explain.
 */
export const LAYERS = [
  'ds.reset',
  'ds.primitives',
  'ds.theme',
  'ds.base',
  'ds.layout',
  'ds.components',
  'site.blocks',
];
