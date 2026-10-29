/** Measurable hex/rgb color as [r, g, b, alpha], otherwise null. */
export function parseColor(value) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  const hex = text.match(/^#([0-9a-f]{3,8})$/i);
  if (hex && [3, 4, 6, 8].includes(hex[1].length)) {
    const digits = hex[1].length <= 4 ? [...hex[1]].map((c) => c + c).join('') : hex[1];
    const channels = [0, 2, 4, 6].slice(0, digits.length / 2).map((i) => parseInt(digits.slice(i, i + 2), 16));
    return [...channels.slice(0, 3), channels[3] === undefined ? 1 : channels[3] / 255];
  }
  const rgb = text.match(/^rgba?\(([^)]+)\)$/i);
  if (!rgb || rgb[1].includes('var')) return null;
  const [channels, alpha, extra] = rgb[1].split('/');
  if (extra !== undefined || /(?:^|,)\s*,|,\s*$/.test(channels)) return null;
  const parts = channels.trim().split(/[\s,]+/).map(Number);
  if (parts.length < 3 || parts.length > 4) return null;
  if (alpha !== undefined && (parts.length !== 3 || !alpha.trim())) return null;
  if (!parts.slice(0, 3).every((n) => Number.isFinite(n) && n >= 0 && n <= 255)) return null;
  const opacity = alpha === undefined ? (parts[3] ?? 1) : Number(alpha.replace('%', '')) / (alpha.includes('%') ? 100 : 1);
  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) return null;
  return [...parts.slice(0, 3), opacity];
}

/** Composite a foreground onto an opaque backdrop. */
export const over = ([r, g, b, a], backdrop) =>
  a >= 1 ? [r, g, b] : [r, g, b].map((channel, index) => channel * a + backdrop[index] * (1 - a));

const channel = (c) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

export function contrast(a, b) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}
