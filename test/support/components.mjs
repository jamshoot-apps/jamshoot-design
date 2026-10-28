import * as ds from '../../src/index.js';
import { specOf } from '../../src/define.js';
import { exampleBlocks, runExample } from '../../scripts/docs.mjs';
import { read } from './library.mjs';

export const components = Object.entries(ds).filter(([, value]) => specOf(value));

export function documentedCalls(name) {
  const source = read(specOf(ds[name]).docs);
  const calls = [];
  const wrapped = (options) => {
    calls.push(options);
    return ds[name](options);
  };

  for (const code of exampleBlocks(source)) {
    runExample(code, { [name]: wrapped });
  }

  return calls;
}
