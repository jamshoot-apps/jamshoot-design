import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { filesBelow } from '../../src/cli/files.js';
import { librarySheets } from '../../src/cli/build.mjs';

export const LIB = fileURLToPath(new URL('../../', import.meta.url));
export const read = (path) => readFileSync(join(LIB, path), 'utf8');
export const filesIn = (directory, extension) => filesBelow(join(LIB, directory), extension).map((path) => path.slice(LIB.length));
export const libraryStyles = () => Object.values(librarySheets()).flat().map((path) => path.slice(LIB.length));
