import { acquireBuildLock } from '../../src/cli/build-lock.js';

process.on('message', () => {});
await acquireBuildLock(process.argv[2]);
process.send('locked');
// The IPC channel keeps this process alive until the test terminates it.
