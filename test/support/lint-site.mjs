import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lint } from '../../src/cli/lint.mjs';
import { read } from './library.mjs';

export const theme = read('src/tokens/themes/dark.css');

/** A second palette, for the rules about a site that declares more than one. */
export const altTheme = read('src/tokens/themes/light.css');

/** Builds a throwaway site, runs the lint over it, and hands back what failed. */
export function rulesFor(files, options) {
  const site = mkdtempSync(join(tmpdir(), 'ds-rule-'));

  try {
    writeFileSync(join(site, 'theme.css'), files['theme.css'] ?? theme);

    for (const [name, contents] of Object.entries(files)) {
      if (name === 'theme.css') {
        continue;
      }

      mkdirSync(join(site, name, '..'), { recursive: true });
      writeFileSync(join(site, name), contents);
    }

    return lint(site, options);
  } finally {
    rmSync(site, { recursive: true, force: true });
  }
}

export const ruleNames = (results) => [...new Set(results.map((entry) => entry.rule))];

/** The same, straight from a set of files: the rule names one throwaway site trips. */
export const ruleFor = (files) => ruleNames(rulesFor(files));
