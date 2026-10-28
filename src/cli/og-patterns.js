/**
 * Decorative background textures for `og-image.mjs`'s share-image card.
 * Identical inputs produce identical SVG, so `og-image.mjs --check` can compare
 * re-renders byte-for-byte.
 *
 * `dots`, `diagonal`, `grid`, `waves`, `circles`, `arcs` and `mesh` keep the
 * established pattern geometry, reseeded with this file's own deterministic hash.
 * `scatter` is this library's own addition: a staggered spread of the configured icon set's
 * glyphs.
 */

import { iconSource } from '../icons.js';

export const PATTERNS = ['none', 'dots', 'diagonal', 'grid', 'waves', 'circles', 'arcs', 'mesh', 'scatter'];
export const DEFAULT_SCATTER_ICONS = ['star', 'star-outline', 'sparkles-outline'];

/* ---- shared helpers ---------------------------------------------------------------- */

/** Deterministic, not `Math.random` — the same inputs must draw the same pattern, or `--check` could never be stable. */
function seededRandom(seed) {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;

  return value - Math.floor(value);
}

/** A repeatable stream of [0,1) values off one seed, for a pattern that draws more than one value per shape. */
function randomStream(seedBase) {
  let i = 0;

  return () => seededRandom(seedBase + (i += 1) * 97.13);
}

const clampNum = (value, min, max) => Math.max(min, Math.min(max, value));

/** A row of `S`-curves, one wavelength at a time, shared by the wave and mesh patterns. */
function makeWavePath(y, width, wavelength, amplitude) {
  let d = `M ${-wavelength} ${y}`;

  for (let x = -wavelength; x < width + wavelength; x += wavelength) {
    d += ` C ${x + wavelength * 0.25} ${y - amplitude}, ${x + wavelength * 0.25} ${y - amplitude}, ${x + wavelength * 0.5} ${y}`;
    d += ` C ${x + wavelength * 0.75} ${y + amplitude}, ${x + wavelength * 0.75} ${y + amplitude}, ${x + wavelength} ${y}`;
  }

  return d;
}

/** The same curve, turned 90° for the mesh pattern's vertical pass. */
function makeVerticalWavePath(x, height, wavelength, amplitude) {
  let d = `M ${x} ${-wavelength}`;

  for (let y = -wavelength; y < height + wavelength; y += wavelength) {
    d += ` C ${x - amplitude} ${y + wavelength * 0.25}, ${x - amplitude} ${y + wavelength * 0.25}, ${x} ${y + wavelength * 0.5}`;
    d += ` C ${x + amplitude} ${y + wavelength * 0.75}, ${x + amplitude} ${y + wavelength * 0.75}, ${x} ${y + wavelength}`;
  }

  return d;
}

/* ---- scatter: the library's own icons, not a port -------------------------------- */

/** The selected icon set supplies the same glyphs as the page components. */
const iconGlyph = (name) => iconSource(name).replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

/**
 * A staggered field of the library's own icons, sized and rotated per instance off a
 * seeded hash, adapted to this card's own layout: the icon and title sit vertically
 * centred across nearly the full width here, so the quiet band this fades into is
 * horizontal (top and bottom breathe; the text's own row does not), not the left-hand
 * margin used by other layouts.
 */
function scatterSvg(icons, color, width, height, iconSize) {
  const glyphs = icons.map(iconGlyph);
  const bandTop = (height - iconSize) / 2 - 40;
  const bandBottom = (height + iconSize) / 2 + 40;
  const columns = 10;
  const rows = 5;
  const stepX = width / columns;
  const stepY = height / rows;
  const placements = [];

  for (let row = 0; row < rows; row += 1) {
    const stagger = row % 2 === 1 ? stepX / 2 : 0;

    for (let col = 0; col < columns; col += 1) {
      const seed = row * columns + col;
      const x = clampNum(col * stepX + stepX / 2 + stagger + (seededRandom(seed) - 0.5) * stepX * 0.5, 24, width - 24);
      const y = clampNum(row * stepY + stepY / 2 + (seededRandom(seed + 50) - 0.5) * stepY * 0.5, 24, height - 24);
      const quiet = y > bandTop && y < bandBottom;
      const glyph = glyphs[Math.floor(seededRandom(seed + 10) * glyphs.length)];
      const size = Math.round((28 + seededRandom(seed + 20) * 26) * (quiet ? 0.55 : 1));
      const rotation = Math.round((seededRandom(seed + 30) - 0.5) * 50);
      const opacity = ((0.06 + seededRandom(seed + 40) * 0.09) * (quiet ? 0.45 : 1)).toFixed(3);
      const scale = (size / 512).toFixed(4);

      placements.push(
        `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rotation}) scale(${scale}) translate(-256 -256)" fill="${color}" stroke="${color}" opacity="${opacity}">${glyph.replaceAll('currentColor', color)}</g>`,
      );
    }
  }

  return placements;
}

/* ---- arcs / mesh: the two multi-shape ports --------------------------------------- */

/** Concentric dashed rings, each rotated off the last — ported from `PatternLayer.tsx`'s `arcs` branch of its circles/arcs pair. */
function arcsSvg(color, width, height) {
  const random = randomStream(53);
  const cx = width / 2;
  const cy = height / 2;
  const rings = 6;
  const maxRadius = Math.max(width, height) * 0.56;
  const shapes = [];

  for (let index = 0; index < rings; index += 1) {
    const r = maxRadius * ((index + 1) / rings);
    const rotation = Math.round(random() * 180);

    shapes.push(
      `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-dasharray="${(r * 0.28).toFixed(1)} ${(r * 0.16).toFixed(1)}" transform="rotate(${rotation} ${cx} ${cy})"/>`,
    );
  }

  return shapes;
}

/** Horizontal and vertical wave passes together — ported from `PatternLayer.tsx`'s `mesh` branch, which shares `waves`' curve on both axes. */
function meshSvg(color, width, height) {
  const spacing = 72;
  const wavelength = Math.max(70, spacing * 3.1);
  const amplitude = spacing * 0.3;
  const shapes = [];

  for (let y = -spacing; y < height + spacing; y += spacing) {
    shapes.push(`<path d="${makeWavePath(y, width, wavelength, amplitude)}" fill="none" stroke="${color}" stroke-width="1" stroke-linecap="round" opacity="0.82"/>`);
  }

  for (let x = -spacing; x < width + spacing; x += spacing) {
    shapes.push(`<path d="${makeVerticalWavePath(x, height, wavelength, amplitude * 0.86)}" fill="none" stroke="${color}" stroke-width="0.85" stroke-linecap="round" opacity="0.48"/>`);
  }

  return shapes;
}

/* ---- the dispatch ------------------------------------------------------------------- */

/**
 * The SVG for one pattern, sized to `width`×`height`. `iconSize`/`scatterIcons` only
 * matter for `pattern: 'scatter'` — every other pattern ignores them.
 *
 * Double-quoted throughout: no literal `'` survives `encodeURIComponent`, so the
 * result nests safely inside a CSS `url('…')` wherever the caller embeds it.
 */
function patternSvg(pattern, color, { width, height, iconSize, scatterIcons }) {
  const viewBox = `width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"`;

  if (pattern === 'dots') {
    return `<svg xmlns="http://www.w3.org/2000/svg" ${viewBox}><defs><pattern id="p" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="2.2" fill="${color}"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/></svg>`;
  }

  if (pattern === 'diagonal') {
    // A vertical line inside a tile rotated 45°; SVG handles the seamless tiling, not hand-derived offsets.
    return `<svg xmlns="http://www.w3.org/2000/svg" ${viewBox}><defs><pattern id="p" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="22" stroke="${color}" stroke-width="4"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/></svg>`;
  }

  if (pattern === 'grid') {
    // An L-shaped path per cell (top edge + left edge) tiles into a full ruled grid.
    return `<svg xmlns="http://www.w3.org/2000/svg" ${viewBox}><defs><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0 L0 0 0 40" fill="none" stroke="${color}" stroke-width="1.5"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/></svg>`;
  }

  if (pattern === 'waves') {
    const spacing = 46;
    const lines = [];

    for (let y = spacing / 2; y < height + spacing; y += spacing) {
      lines.push(`<path d="${makeWavePath(y, width, 160, 10)}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round"/>`);
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" ${viewBox}>${lines.join('')}</svg>`;
  }

  if (pattern === 'circles') {
    // Concentric rings anchored off-canvas, top right — a quiet corner burst rather than a bullseye over the content.
    const cx = width * 0.9;
    const cy = height * -0.05;
    const rings = 7;
    const maxRadius = Math.max(width, height) * 0.62;
    const circles = Array.from(
      { length: rings },
      (_, index) => `<circle cx="${cx}" cy="${cy}" r="${(maxRadius * ((index + 1) / rings)).toFixed(1)}" fill="none" stroke="${color}" stroke-width="1.4"/>`,
    ).join('');

    return `<svg xmlns="http://www.w3.org/2000/svg" ${viewBox}>${circles}</svg>`;
  }

  if (pattern === 'arcs') {
    return `<svg xmlns="http://www.w3.org/2000/svg" ${viewBox}>${arcsSvg(color, width, height).join('')}</svg>`;
  }

  if (pattern === 'mesh') {
    return `<svg xmlns="http://www.w3.org/2000/svg" ${viewBox}>${meshSvg(color, width, height).join('')}</svg>`;
  }

  // 'scatter'
  return `<svg xmlns="http://www.w3.org/2000/svg" ${viewBox}>${scatterSvg(scatterIcons, color, width, height, iconSize).join('')}</svg>`;
}

export const patternDataUri = (pattern, color, options) => `data:image/svg+xml,${encodeURIComponent(patternSvg(pattern, color, options))}`;
