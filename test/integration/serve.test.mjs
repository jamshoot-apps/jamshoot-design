import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { connect } from 'node:net';
import { createServer, get } from 'node:http';
import { test } from 'node:test';
import fs, { cpSync, existsSync, mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncBuiltinESMExports } from 'node:module';
import { setTimeout as delay } from 'node:timers/promises';
import vm from 'node:vm';

import { portArgument, runner, serveDirectory, watchPaths, withLiveReload } from '../../src/cli/serve.js';

async function freePort() {
  const reservation = createServer();
  await new Promise((resolve) => reservation.listen(0, '127.0.0.1', resolve));
  const { port } = reservation.address();
  await new Promise((resolve) => reservation.close(resolve));
  return port;
}

/** A request whose Host header is set explicitly, which fetch would not allow. */
function requestWithHost(port, host, path = '/index.html') {
  return new Promise((resolve, reject) => {
    get({ host: '127.0.0.1', port, path, headers: { host } }, (response) => {
      response.resume();
      resolve(response.statusCode);
    }).on('error', reject);
  });
}

/** An HTTP/1.0 request written by hand: the one case an HTTP client will not send, no Host. */
function requestWithoutHost(port) {
  return new Promise((resolve, reject) => {
    let text = '';
    const socket = connect(port, '127.0.0.1', () => socket.write('GET /index.html HTTP/1.0\r\n\r\n'));
    socket.on('data', (chunk) => { text += chunk; });
    socket.on('end', () => resolve(Number(text.split(' ')[1])));
    socket.on('error', reject);
  });
}

test('live reload is injected into served HTML without changing the build', () => {
  const html = '<!doctype html><body><main>Hello</main></body>';
  const served = withLiveReload(html);

  assert.match(served, /EventSource\('\/__jamshoot_reload'\)/);
  assert.ok(served.startsWith(html));
  assert.ok(served.endsWith('</script>'));
  assert.equal(html, '<!doctype html><body><main>Hello</main></body>');
});

test('live reload preserves body-like text in scripts, raw text and comments', () => {
  const script = 'const value = "</body>";';
  const html = `<body><script>${script}</script><textarea></body></textarea><!-- </body> --></body>`;
  const served = withLiveReload(html);
  assert.ok(served.startsWith(html));
  new vm.Script(served.match(/<script>([\s\S]*?)<\/script>/)[1]);
});

test('watcher follows atomic file saves and newly created optional directories', { timeout: 10000 }, async (context) => {
  const root = mkdtempSync(join(tmpdir(), 'ds-watch-native-'));
  const config = join(root, 'site.config.js');
  writeFileSync(config, 'old');
  let calls = 0;
  const { close: stop } = watchPaths([config, join(root, 'blocks'), join(root, 'themes')], async () => { calls++; });
  context.after(() => { stop(); rmSync(root, { recursive: true, force: true }); });
  // Give the platform's recursive watcher time to register the initial directory.
  await delay(300);
  const rebuilt = async (action) => {
    const before = calls;
    action();
    for (let i = 0; i < 60 && calls === before; i++) await delay(25);
    assert.ok(calls > before, 'source change did not rebuild');
    await delay(100);
  };
  await rebuilt(() => {
    writeFileSync(join(root, 'replacement'), 'new');
    renameSync(join(root, 'replacement'), config);
  });
  await rebuilt(() => writeFileSync(config, 'edited after atomic save'));
  for (const directory of ['blocks', 'themes']) {
    await rebuilt(() => {
      mkdirSync(join(root, directory));
      writeFileSync(join(root, directory, 'new.js'), 'first');
    });
    await rebuilt(() => writeFileSync(join(root, directory, 'new.js'), 'second'));
  }
  const before = calls;
  mkdirSync(join(root, 'dist'));
  writeFileSync(join(root, 'dist/index.html'), 'output');
  await delay(200);
  assert.equal(calls, before, 'output changes caused a rebuild loop');
});

test('a new JamShoot server replaces the old server on the same port', async (context) => {
  const reservation = createServer();
  await new Promise((resolve) => reservation.listen(0, resolve));
  const { port } = reservation.address();
  await new Promise((resolve) => reservation.close(resolve));

  let takenOver = false;
  await serveDirectory({ root: '', port, onTakeover: () => (takenOver = true) });
  const second = await serveDirectory({ root: '', port });
  context.after(() => second.close());

  assert.equal(takenOver, true);
});

test('a malformed URL or a takeover from a web page does not stop the server', async (context) => {
  const reservation = createServer();
  await new Promise((resolve) => reservation.listen(0, resolve));
  const { port } = reservation.address();
  await new Promise((resolve) => reservation.close(resolve));

  let takenOver = false;
  const server = await serveDirectory({ root: '', port, onTakeover: () => (takenOver = true) });
  context.after(() => server.close());
  const base = `http://127.0.0.1:${port}`;

  assert.equal((await fetch(`${base}/%E0`)).status, 400);
  const invalid = await new Promise((resolve, reject) =>
    get({ host: '127.0.0.1', port, path: '//a:b' }, (response) => resolve(response.resume().statusCode)).on('error', reject),
  );
  assert.equal(invalid, 400);

  const takeover = await fetch(`${base}/__jamshoot_takeover`, {
    method: 'POST',
    headers: { origin: 'http://example.test' },
  });
  assert.notEqual(takeover.status, 204);
  assert.equal(takenOver, false);
  assert.equal((await fetch(`${base}/%E0`)).status, 400, 'the server is still answering');
});

test('the dev server survives generation replacement and filesystem read failures', async (context) => {
  const parent = mkdtempSync(join(tmpdir(), 'ds-server-generation-'));
  const root = join(parent, 'dist');
  mkdirSync(root);
  writeFileSync(join(root, 'index.html'), '<body>Current generation</body>');
  writeFileSync(join(root, 'asset.bin'), Buffer.from([0, 255, 5]));
  const reservation = createServer();
  await new Promise((resolve) => reservation.listen(0, resolve));
  const { port } = reservation.address();
  await new Promise((resolve) => reservation.close(resolve));
  const server = await serveDirectory({ root, port });
  context.after(() => {
    context.mock.restoreAll();
    syncBuiltinESMExports();
    server.close();
    rmSync(parent, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${port}`;
  assert.equal((await fetch(base)).status, 200);
  assert.deepEqual(Buffer.from(await (await fetch(`${base}/asset.bin`)).arrayBuffer()), Buffer.from([0, 255, 5]));

  renameSync(root, join(parent, 'previous'));
  assert.equal((await fetch(base)).status, 503);
  renameSync(join(parent, 'previous'), root);

  // Simulate replacement after existence checks but before the filesystem opens a file.
  const originalRead = fs.promises.readFile;
  let code = 'ENOENT';
  context.mock.method(fs.promises, 'readFile', (...args) => code
    ? Promise.reject(Object.assign(new Error('test filesystem failure'), { code }))
    : originalRead(...args));
  syncBuiltinESMExports();
  for (const path of ['/', '/asset.bin', '/missing']) {
    assert.equal((await fetch(`${base}${path}`)).status, 503);
  }
  code = 'EACCES';
  assert.equal((await fetch(base)).status, 500);
  code = null;
  assert.match(await (await fetch(base)).text(), /Current generation/);
});

test('runner queues changes during its initial build without overlapping work', { timeout: 10000 }, async (context) => {
  const root = mkdtempSync(join(tmpdir(), 'ds-runner-start-'));
  const reservation = createServer();
  await new Promise((resolve) => reservation.listen(0, resolve));
  const { port } = reservation.address();
  await new Promise((resolve) => reservation.close(resolve));
  let event;
  let closed = false;
  context.mock.method(fs, 'watch', (_path, _options, listener) => {
    event = listener;
    return { close: () => { closed = true; } };
  });
  context.mock.method(console, 'log', () => {});
  syncBuiltinESMExports();
  const first = Promise.withResolvers();
  const second = Promise.withResolvers();
  let input = 'old';
  let output;
  let builds = 0;
  let active = 0;
  let maximum = 0;
  let server;
  context.after(() => {
    server?.close();
    context.mock.restoreAll();
    syncBuiltinESMExports();
    rmSync(root, { recursive: true, force: true });
  });
  const starting = runner({ label: 'test', root, port, watching: [root], build: async () => {
    assert.equal(typeof event, 'function', 'watching must start before the first build');
    const snapshot = input;
    builds++;
    maximum = Math.max(maximum, ++active);
    try {
      if (builds === 1) await first.promise;
      output = snapshot;
      return true;
    } finally {
      active--;
      if (builds === 2) second.resolve();
    }
  } });
  input = 'new';
  for (let i = 0; i < 3; i++) {
    event('change', 'source.js');
    await delay(80);
  }
  assert.equal(builds, 1);
  first.resolve();
  server = await starting;
  await second.promise;
  await new Promise(setImmediate);
  assert.equal(builds, 2, 'the startup save burst must cause exactly one trailing build');
  assert.equal(output, 'new');
  assert.equal(maximum, 1);
  server.close();
  server = null;
  assert.equal(closed, true);
});

test('watcher builds never overlap, coalesce pending saves and recover from failure', async (context) => {
  const root = mkdtempSync(join(tmpdir(), 'ds-watch-queue-'));
  let event;
  let closed = false;
  context.mock.method(fs, 'watch', (_path, _options, listener) => {
    event = listener;
    return { close: () => { closed = true; } };
  });
  const errors = context.mock.method(console, 'error', () => {});
  syncBuiltinESMExports();
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const first = Promise.withResolvers();
  let calls = 0;
  let active = 0;
  let maximum = 0;
  const { close: stop } = watchPaths([root], async () => {
    calls++;
    active++;
    maximum = Math.max(maximum, active);
    try {
      if (calls === 1) await first.promise;
      if (calls === 2) throw new Error('expected build failure');
    } finally { active--; }
  });
  context.after(() => {
    stop();
    context.mock.restoreAll();
    syncBuiltinESMExports();
    rmSync(root, { recursive: true, force: true });
  });
  event('change', 'first.js');
  context.mock.timers.tick(60);
  assert.equal(calls, 1);
  for (const name of ['second.js', 'third.js', 'fourth.js']) {
    event('change', name);
    context.mock.timers.tick(60);
  }
  assert.equal(calls, 1, 'saves during a build started overlapping work');
  first.resolve();
  await new Promise(setImmediate);
  context.mock.timers.tick(60);
  await new Promise(setImmediate);
  assert.equal(calls, 2, 'pending saves should produce one trailing build');
  assert.equal(errors.mock.callCount(), 1);
  event('change', 'recovered.js');
  context.mock.timers.tick(60);
  await new Promise(setImmediate);
  assert.equal(calls, 3);
  assert.equal(maximum, 1);
  event('change', 'cancelled.js');
  stop();
  context.mock.timers.tick(60);
  await new Promise(setImmediate);
  assert.equal(calls, 3, 'closing the watcher must cancel queued work');
  assert.equal(closed, true);
});

test('served files get their declared media type and nosniff', async (context) => {
  const root = mkdtempSync(join(tmpdir(), 'ds-serve-types-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  const types = {
    'app.mjs': 'text/javascript; charset=utf-8',
    'feed.xml': 'application/xml; charset=utf-8',
    'manifest.webmanifest': 'application/manifest+json',
    'font.woff': 'font/woff',
    'photo.jpeg': 'image/jpeg',
    'pic.gif': 'image/gif',
    'modern.avif': 'image/avif',
    'movie.mp4': 'video/mp4',
    'clip.webm': 'video/webm',
    'doc.pdf': 'application/pdf',
  };
  for (const name of Object.keys(types)) writeFileSync(join(root, name), 'x');
  const port = await freePort();
  const server = await serveDirectory({ root, port });
  context.after(() => server.close());

  for (const [name, type] of Object.entries(types)) {
    const response = await fetch(`http://127.0.0.1:${port}/${name}`);
    assert.equal(response.status, 200, name);
    assert.equal(response.headers.get('content-type'), type, name);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff', name);
    await response.arrayBuffer();
  }
});

test('only loopback host names reach the dev server', async (context) => {
  const root = mkdtempSync(join(tmpdir(), 'ds-serve-host-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(root, 'index.html'), '<body>Hello</body>');
  const port = await freePort();
  const server = await serveDirectory({ root, port });
  context.after(() => server.close());

  assert.equal(await requestWithHost(port, `127.0.0.1:${port}`), 200);
  assert.equal(await requestWithHost(port, `localhost:${port}`), 200);
  assert.equal(await requestWithHost(port, `LocalHost:${port}`), 200, 'host names are case-insensitive');
  // The server listens on 127.0.0.1 only, so an IPv6 loopback name is not this server.
  assert.equal(await requestWithHost(port, `[::1]:${port}`), 421);
  assert.equal(await requestWithHost(port, 'evil.example'), 421, 'a rebound name is refused');
  assert.equal(await requestWithHost(port, `evil.example:${port}`), 421);
  assert.equal(await requestWithHost(port, `127.0.0.1:${port + 1}`), 421, 'another port is not this server');
  assert.equal(await requestWithoutHost(port), 421, 'a request without Host is refused');
});

/** A request sent with its path exactly as written: fetch would normalise `/.//docs` first. */
function rawRequest(port, path) {
  return new Promise((resolve, reject) => {
    get({ host: '127.0.0.1', port, path }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, location: response.headers.location, body }));
    }).on('error', reject);
  });
}

test('a directory URL without its trailing slash redirects to the slash form', async (context) => {
  const root = mkdtempSync(join(tmpdir(), 'ds-serve-dir-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'docs'));
  writeFileSync(join(root, 'docs', 'index.html'), '<body>Docs</body>');
  writeFileSync(join(root, 'docs', 'support.html'), '<body>Support</body>');
  mkdirSync(join(root, 'my docs'));
  writeFileSync(join(root, 'my docs', 'index.html'), '<body>Spaced</body>');
  const port = await freePort();
  const server = await serveDirectory({ root, port });
  context.after(() => server.close());

  const redirect = await rawRequest(port, '/docs');
  assert.equal(redirect.status, 301);
  assert.equal(redirect.location, '/docs/');
  assert.equal((await rawRequest(port, '/docs?lang=en&q=%20a')).location, '/docs/?lang=en&q=%20a', 'the query survives');
  assert.equal((await rawRequest(port, '/my%20docs')).location, '/my%20docs/', 'the encoding survives');
  assert.equal((await rawRequest(port, '/.//docs')).location, '/docs/', 'leading slashes cannot make the Location another origin');

  const index = await rawRequest(port, '/docs/');
  assert.equal(index.status, 200);
  assert.match(index.body, /<body>Docs<\/body>/);
  assert.match(index.body, /EventSource\('\/__jamshoot_reload'\)/, 'the index page still reloads live');
  assert.equal((await rawRequest(port, '/docs/support.html')).status, 200, 'page-relative links resolve inside the directory');
  assert.equal((await rawRequest(port, '/docs/?lang=en')).status, 200, 'a query on the slash form is served');
});

test('an extensionless URL serves its .html file, even beside a directory of the same name', async (context) => {
  const root = mkdtempSync(join(tmpdir(), 'ds-serve-about-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(root, 'about.html'), '<body>About file</body>');
  mkdirSync(join(root, 'about'));
  writeFileSync(join(root, 'about', 'index.html'), '<body>About directory</body>');
  mkdirSync(join(root, 'guide'));
  writeFileSync(join(root, 'guide', 'index.html'), '<body>Guide</body>');
  const port = await freePort();
  const server = await serveDirectory({ root, port });
  context.after(() => server.close());

  const file = await rawRequest(port, '/about');
  assert.equal(file.status, 200);
  assert.equal(file.location, undefined, 'no redirect when a file of that name exists');
  assert.match(file.body, /About file/);
  assert.match((await rawRequest(port, '/about/')).body, /About directory/);
  assert.match((await rawRequest(port, '/about.html')).body, /About file/);
  assert.equal((await rawRequest(port, '/guide')).location, '/guide/', 'a directory without a file redirects');
  assert.equal((await rawRequest(port, '/missing')).status, 404);
});

test('portArgument reads --port in both spellings, before or after the site', () => {
  assert.deepEqual(portArgument(['--port=5000'], 4173), { port: 5000, rest: [] });
  assert.deepEqual(portArgument(['--port', '5000'], 4173), { port: 5000, rest: [] });
  assert.deepEqual(portArgument(['site', '--port=5000'], 4173), { port: 5000, rest: ['site'] });
  assert.deepEqual(portArgument(['site', '--port', '5000'], 4173), { port: 5000, rest: ['site'] });
  assert.deepEqual(portArgument(['--port=5000', 'site'], 4173), { port: 5000, rest: ['site'] });
  assert.deepEqual(portArgument(['--port', '5000', 'site'], 4173), { port: 5000, rest: ['site'] });
});

test('portArgument uses the fallback without the flag and reports a bad value as NaN', () => {
  assert.deepEqual(portArgument(['site'], '4180'), { port: 4180, rest: ['site'] });
  assert.deepEqual(portArgument([], 4173), { port: 4173, rest: [] });
  assert.equal(portArgument(['--port=70000'], 4173).port, 70000, 'the range is checked by runner()');
  assert.ok(Number.isNaN(portArgument(['site', '--port'], 4173).port), 'a missing value');
  assert.ok(Number.isNaN(portArgument(['--port', '--list'], 4173).port), 'a flag is never a value');
  assert.deepEqual(portArgument(['--port', '--list'], 4173).rest, ['--list']);
  assert.ok(Number.isNaN(portArgument(['--port=5000x'], 4173).port), 'a malformed value');
});

test('--port is read in both spellings and in either position, for both runners', { timeout: 20000 }, async (context) => {
  const copy = mkdtempSync(join(tmpdir(), 'ds-dev-port-'));
  context.after(() => rmSync(copy, { recursive: true, force: true }));
  // A copy: if the port were ignored the runner would build into the site it was given.
  cpSync(fileURLToPath(new URL('../fixtures/site/', import.meta.url)), copy, { recursive: true });
  rmSync(join(copy, 'dist'), { recursive: true, force: true });
  const dev = fileURLToPath(new URL('../../src/cli/dev.mjs', import.meta.url));

  const docsServer = fileURLToPath(new URL('../../scripts/docs-server.mjs', import.meta.url));
  // The port before the site is the case the old parser got wrong: its value became the site name.
  const cases = [
    [dev, copy, '--port=70000'],
    [dev, copy, '--port', '70000'],
    [dev, '--port=70000', copy],
    [dev, '--port', '70000', copy],
    [dev, copy, '--port'],
    [docsServer, '--port=70000'],
    [docsServer, '--port', '70000'],
  ];
  for (const [script, ...args] of cases) {
    const result = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', timeout: 10000 });
    assert.equal(result.status, 1, `${args.join(' ')} is rejected by validation`);
    assert.match(result.stderr, /--port needs a number from 1 to 65535/);
    assert.doesNotMatch(result.stderr, /is not a site/, `${args.join(' ')} must not name the port as a site`);
  }
  assert.equal(existsSync(join(copy, 'dist')), false, 'nothing was built');
});
