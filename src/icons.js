/**
 * Build-time SVG icons. The components' own icons ship in `src/assets/icons/`; a site adds
 * or replaces icons with a directory named by `JAMSHOOT_ICONS_DIR`, checked first.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { escape, raw } from './html.js';

const BUILT_IN = fileURLToPath(new URL('./assets/icons/', import.meta.url));
const cache = new Map();

function directories() {
  const site = process.env.JAMSHOOT_ICONS_DIR ? resolve(process.env.JAMSHOOT_ICONS_DIR) : null;
  if (site && !statSync(site, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error(`JAMSHOOT_ICONS_DIR must name an existing SVG directory: ${site}`);
  }
  return site ? [site, BUILT_IN] : [BUILT_IN];
}

const svgNames = (directory) =>
  readdirSync(directory).filter((name) => name.endsWith('.svg')).map((name) => name.slice(0, -4));

export function iconNames() {
  return [...new Set(directories().flatMap(svgNames))].sort();
}

export function iconSource(name) {
  const directory = directories().find((candidate) => svgNames(candidate).includes(name));
  if (!directory) throw new TypeError('inlineIcon(): "' + name + '" is not a built-in icon or in JAMSHOOT_ICONS_DIR. Set JAMSHOOT_ICONS_DIR to a trusted SVG directory that has it. Available icons: ' + iconNames().join(', ') + '.');
  const path = join(directory, name + '.svg');
  if (!cache.has(path)) cache.set(path, readFileSync(path, 'utf8').trim());
  return cache.get(path);
}

export function inlineIcon(name, { label } = {}) {
  const source = iconSource(name);
  const attributes = [
    'class="ds-icon ds-icon--' + escape(name) + '"',
    'fill="currentColor"',
    label ? 'role="img" aria-label="' + escape(label) + '"' : 'aria-hidden="true"',
  ].join(' ');
  return raw(source.replace('<svg ', '<svg ' + attributes + ' '));
}
