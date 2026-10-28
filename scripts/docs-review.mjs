#!/usr/bin/env node
/**
 * Forces an explicit documentation review after a component's renderer or CSS
 * changes. The marker lives in that component's README, not in a central manifest.
 *
 *   npm run docs:review -- card --reason "Documented the tighter copy spacing."
 *   npm run docs:review -- card --reason "No doc change: internal rename only."
 *   npm run docs:review -- --check
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { componentsIn, TIER_NAMES } from '../src/cli/components.js';
import { isMain } from '../src/cli/sites.js';
import * as ds from '../src/index.js';
import { siteConfig } from '../src/config.js';

const LIB = fileURLToPath(new URL('../', import.meta.url));
const MARKER = /<!-- docs-review: ([a-f0-9]{12}); reason: ([^\n]+) -->/;

export function fingerprint(parts) {
  const hash = createHash('sha256');

  for (const [name, contents] of parts) {
    hash.update(name).update('\0').update(contents).update('\0');
  }

  return hash.digest('hex').slice(0, 12);
}

export function componentFingerprint(entry, readSource = readFileSync) {
  const paths = [entry.source, entry.stylesheet, ...(entry.dependencies ?? []),
    ...(entry.runtime ?? []).map((name) => join(LIB, 'src/runtime', `${name}.js`))].filter(Boolean);
  return fingerprint(paths.map((path) => [relative(LIB, path), readSource(path, 'utf8')]));
}

export function reviewMarker(markdown) {
  const match = markdown.match(MARKER);
  return match ? { fingerprint: match[1], reason: match[2] } : null;
}

export function reviews() {
  const entries = TIER_NAMES.flatMap((tier) => componentsIn(tier)).map((entry) => ({
    ...entry, runtime: ds[entry.name]?.spec?.runtime ?? [],
  }));
  entries.push(
    { name: 'siteConfig', source: join(LIB, 'src/config.js'), docs: join(LIB, siteConfig.spec.docs) },
    { name: 'build', source: join(LIB, 'src/cli/build.mjs'), docs: join(LIB, 'docs/authoring.md'),
      dependencies: ['src/cli/styles.mjs', 'src/cli/serve.js', 'src/cli/build-lock.js', 'src/cli/output.js', 'src/cli/files.js', 'src/cli/colours.js', 'scripts/docs/build.mjs', 'src/templates.js', 'src/html-transform.js', 'src/cli/og-image.mjs', 'src/cli/og-patterns.js'].map((path) => join(LIB, path)) },
    { name: 'icons', source: join(LIB, 'src/icons.js'), docs: join(LIB, 'docs/foundations/icons.md') },
  );
  return entries.map((entry) => {
    const current = componentFingerprint(entry);
    const marker = reviewMarker(readFileSync(entry.docs, 'utf8'));

    return { ...entry, current, marker, fresh: marker?.fingerprint === current };
  });
}

export const staleReviews = () => reviews().filter(({ fresh }) => !fresh);

function acknowledge(entry, reason) {
  const clean = reason.trim();

  if (clean.length < 12 || clean.includes('--') || clean.includes('\n')) {
    throw new Error('docs-review: --reason must be one specific line of at least 12 characters');
  }

  const source = readFileSync(entry.docs, 'utf8');
  const marker = `<!-- docs-review: ${componentFingerprint(entry)}; reason: ${clean} -->`;
  const next = MARKER.test(source)
    ? source.replace(MARKER, marker)
    : source.replace(/^(# .+\n)/, `$1\n${marker}\n`);

  if (next === source && !MARKER.test(source)) {
    throw new Error(`docs-review: ${relative(LIB, entry.docs)} needs a level-one heading`);
  }

  writeFileSync(entry.docs, next);
  console.log(`reviewed ${entry.name} → ${relative(LIB, entry.docs)}`);
}

export function reviewFailure(entry) {
  const state = entry.marker ? `records ${entry.marker.fingerprint}, source is ${entry.current}` : 'has no review marker';

  return `docs-review  ${relative(LIB, entry.source)}${entry.stylesheet ? ` + ${relative(LIB, entry.stylesheet)}` : ''}\n` +
    `             ${relative(LIB, entry.docs)} ${state}\n` +
    `             review the README, then run: npm run docs:review -- ${entry.name} --reason "what changed, or why the docs still apply"`;
}

function printStale(stale) {
  for (const entry of stale) {
    console.error(reviewFailure(entry));
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--check')) {
    const stale = staleReviews();
    printStale(stale);
    console.log(stale.length ? `\n${stale.length} component docs need review` : 'component docs reviewed');
    process.exitCode = stale.length ? 1 : 0;
    return;
  }

  const reasonAt = args.indexOf('--reason');
  const reason = reasonAt === -1 ? '' : args[reasonAt + 1] ?? '';
  const names = args.filter((arg, index) =>
    arg !== '--all' && arg !== '--reason' && index !== reasonAt + 1,
  );
  const entries = reviews();
  const missing = names.filter((name) => !entries.some((entry) => entry.name === name));

  if (missing.length) {
    throw new Error(`docs-review: unknown component${missing.length > 1 ? 's' : ''} ${missing.join(', ')}`);
  }

  const selected = args.includes('--all') ? entries : entries.filter(({ name }) => names.includes(name));

  if (!selected.length) {
    throw new Error('docs-review: name a component, or pass --all');
  }

  for (const entry of selected) acknowledge(entry, reason);
}

if (isMain(import.meta.url)) {
  await main();
}
