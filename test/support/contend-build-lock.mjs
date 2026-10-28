import { rm, writeFile } from 'node:fs/promises';
import { acquireBuildLock } from '../../src/cli/build-lock.js';

// Contends for one build lock until it has held it once. While holding, it creates an exclusive
// marker: if another holder is inside the same critical section, the marker already exists.
const [destination, marker, holdMilliseconds, deadlineMilliseconds] = process.argv.slice(2);
const deadline = Date.now() + Number(deadlineMilliseconds);
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

process.once('message', async () => {
  let overlaps = 0;

  try {
    for (;;) {
      let release;
      try {
        release = await acquireBuildLock(destination);
      } catch (error) {
        if (!error.message.includes('is locked by') || Date.now() > deadline) throw error;
        await delay(2 + Math.random() * 6);
        continue;
      }

      let owned = false;
      try {
        await writeFile(marker, `${process.pid}\n`, { flag: 'wx' });
        owned = true;
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        overlaps += 1;
      }

      await delay(Number(holdMilliseconds));
      if (owned) await rm(marker, { force: true });
      await release();
      break;
    }
    process.send({ overlaps }, () => process.disconnect());
  } catch (error) {
    process.send({ error: error.message }, () => process.disconnect());
  }
});

process.send('ready');
