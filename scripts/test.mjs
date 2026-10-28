/** Supply example icons without shell-specific environment assignment or glob quoting. */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const result = spawnSync(process.execPath, [
  '--test', ...process.argv.slice(2), 'test/**/*.test.mjs', 'src/**/*.test.mjs',
], {
  cwd: root,
  env: { ...process.env, JAMSHOOT_ICONS_DIR: fileURLToPath(new URL('../docs/assets/icons/', import.meta.url)) },
  stdio: 'inherit',
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
