/**
 * The serving half of both runners: a static file server over a build directory, and
 * a watcher that reruns the build when a source file changes. HTML responses get a
 * tiny live-reload client; the files in the build directory remain untouched.
 */

import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, statSync, watch } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { containsPath } from './files.js';
import { userInfo } from 'node:os';
import { promisify } from 'node:util';

const run = promisify(execFile);
const PACKAGE = '@jamshoot-apps/design';
// Recognize only this package's installed src/cli tools or repository scripts.
const OUR_RUNNER = /node(?:\.exe)?\b.*(?:@jamshoot-apps[/\\]design|jamshoot-design)[/\\](?:src[/\\]cli|scripts)[/\\][\w.-]+\.m?js\b/;
const RELOAD_PATH = '/__jamshoot_reload';
const TAKEOVER_PATH = '/__jamshoot_takeover';
const RELOAD_SCRIPT = `<script>new EventSource('${RELOAD_PATH}').onmessage=()=>location.reload()</script>`;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml; charset=utf-8',
};

/**
 * Whether a Host header names this server on loopback. A page under another domain can
 * be pointed at 127.0.0.1 by DNS rebinding; its requests then carry that domain as Host.
 * The server listens on 127.0.0.1 only, so `[::1]` could never be the address it is
 * reached by, and is not accepted.
 */
function loopbackHost(host, port) {
  const name = String(host ?? '').toLowerCase();
  return ['127.0.0.1', 'localhost'].some((loopback) =>
    name === `${loopback}:${port}` || (port === 80 && name === loopback));
}

/**
 * Runs a build script in a child process.
 *
 * A child process per build, deliberately: Node caches an ES module for the life of
 * the process, so an in-process rebuild would keep using the component code this
 * server started with — an edit would appear in the CSS and never in the markup. A
 * fresh process costs about 50 ms and cannot go stale.
 */
export function builder(script, args = []) {
  return async () => {
    const started = Date.now();

    try {
      const { stdout } = await run(process.execPath, [script, ...args]);
      console.log(`${stdout.trim()}  (${Date.now() - started}ms)`);
      return true;
    } catch (error) {
      console.error(`\nbuild failed:\n${(error.stderr || error.message).trim()}\n`);
      return false;
    }
  };
}

/** Rebuilds on any change under `paths`, coalescing the burst an editor save produces. */
export function watchPaths(paths, rebuild, { initial = false } = {}) {
  let pending = null;
  let running = false;
  let dirty = false;
  let stopped = false;
  const watchers = [];

  const next = async () => {
    pending = null;
    if (running || stopped) return;
    running = true;
    dirty = false;
    try {
      await rebuild();
    } catch (error) {
      console.error(`rebuild failed: ${error.message}`);
    } finally {
      running = false;
      if (dirty && !stopped) {
        clearTimeout(pending);
        pending = setTimeout(next, 60);
      }
    }
  };

  const schedule = () => {
    if (stopped) return;
    dirty = true;
    clearTimeout(pending);
    pending = setTimeout(next, 60);
  };

  const targets = paths.map((path) => resolve(path));
  const directories = new Set(targets.map((path) => {
    // Files are replaced by editor saves; watch their parent, never their old inode.
    while (!statSync(path, { throwIfNoEntry: false })?.isDirectory()) path = dirname(path);
    return path;
  }));
  for (const path of directories) {
    if ([...directories].some((parent) => parent !== path && containsPath(parent, path))) continue;
    watchers.push(
      watch(path, { recursive: true }, (_event, filename) => {
        const changed = filename ? join(path, String(filename)) : path;
        if (targets.some((target) => containsPath(target, changed) || containsPath(changed, target))) schedule();
      }),
    );
  }

  return {
    ready: initial ? next() : Promise.resolve(),
    close() {
      stopped = true;
      dirty = false;
      clearTimeout(pending);
      watchers.forEach((watcher) => watcher.close());
    },
  };
}

export function withLiveReload(html) {
  return `${html}${RELOAD_SCRIPT}`;
}

const isFile = (path) => existsSync(path) && statSync(path).isFile();
const isDirectory = (path) => existsSync(path) && statSync(path).isDirectory();

/**
 * Reads `--port 5000` or `--port=5000` from `args`. Returns the port (NaN when the value
 * is missing or not a whole number, so runner() reports it) and the arguments without
 * the flag. A value is never taken from another flag, and a port written before or after
 * the site leaves the same site behind.
 */
export function portArgument(args, fallback) {
  const rest = [];
  let text = String(fallback);

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === '--port') {
      const next = args[index + 1];
      const hasValue = next !== undefined && !next.startsWith('--');
      text = hasValue ? next : '';
      if (hasValue) index += 1;
    } else if (argument.startsWith('--port=')) {
      text = argument.slice('--port='.length);
    } else {
      rest.push(argument);
    }
  }

  return { port: /^\d+$/.test(text) ? Number(text) : NaN, rest };
}

/**
 * Serves `root`. Extensionless URLs resolve to `.html`, the way a static host does,
 * so a link that works here works after deploy.
 */
export async function serveDirectory({ root, port, onListen, onTakeover }) {
  const reloadClients = new Set();

  const server = createServer(async (request, response) => {
    let pathname;
    let search;
    let decoded;

    if (!loopbackHost(request.headers.host, server.address()?.port ?? port)) {
      response.writeHead(421, { 'content-type': TYPES['.txt'] }).end('Misdirected request: this server answers only on loopback addresses.');
      return;
    }

    try {
      ({ pathname, search } = new URL(request.url, 'http://localhost'));
      decoded = decodeURIComponent(pathname);
    } catch {
      response.writeHead(400).end('Bad Request');
      return;
    }

    // A browser always sends Origin on a cross-site POST, and a page must not be able
    // to stop the server; the next runner's takeover request sends none.
    if (
      request.method === 'POST' &&
      pathname === TAKEOVER_PATH &&
      !request.headers.origin &&
      ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress)
    ) {
      response.writeHead(204, { 'x-jamshoot-server': '1' }).end();
      onTakeover?.();
      close();
      return;
    }

    if (pathname === RELOAD_PATH) {
      response.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-store',
        connection: 'keep-alive',
      });
      response.write(': connected\n\n');
      reloadClients.add(response);
      request.on('close', () => reloadClients.delete(response));
      return;
    }

    let path = join(root, normalize(decoded));

    if (!path.startsWith(root)) {
      response.writeHead(403).end('Forbidden');
      return;
    }

    try {
      const directory = isDirectory(path);

      // A directory is addressed with its trailing slash, as on a static host, so that
      // relative links on its index page resolve inside the directory. The raw pathname
      // keeps the request's percent-encoding; leading slashes are collapsed so that a
      // `//host` path cannot turn the Location into another origin.
      if (directory && !pathname.endsWith('/') && !isFile(`${path}.html`)) {
        response.writeHead(301, {
          location: `${pathname.replace(/^\/+/, '/')}/${search}`,
          'cache-control': 'no-store',
        }).end();
        return;
      }

      // An extensionless URL names a file before a directory, as on a static host: with
      // about.html beside about/, `/about` serves the file and `/about/` the index.
      if (directory && pathname.endsWith('/')) {
        path = join(path, 'index.html');
      } else if (!isFile(path) && isFile(`${path}.html`)) {
        path = `${path}.html`;
      }

      if (!existsSync(path)) {
        const fallback = ['404.html', 'index.html'].map((name) => join(root, name)).find(existsSync);

        if (!fallback) {
          response.writeHead(existsSync(root) ? 404 : 503, { 'content-type': TYPES['.txt'], 'retry-after': '1' }).end('Nothing built yet.');
          return;
        }

        const html = await readFile(fallback, 'utf8');
        response.writeHead(404, { 'content-type': TYPES['.html'] });
        response.end(withLiveReload(html));
        return;
      }

      const type = TYPES[extname(path)] ?? 'application/octet-stream';
      // Read before sending headers: a generation may be replaced between lookup and open.
      const contents = await readFile(path);
      response.writeHead(200, {
        'content-type': type,
        // Everything is fingerprinted in production; locally, never serve a stale byte.
        'cache-control': 'no-store',
        // The declared type is the only type a browser may use for this file.
        'x-content-type-options': 'nosniff',
      });
      response.end(type === TYPES['.html'] ? withLiveReload(contents.toString('utf8')) : contents);
    } catch (error) {
      const replacing = error.code === 'ENOENT' || error.code === 'ENOTDIR';
      response.writeHead(replacing ? 503 : 500, { 'content-type': TYPES['.txt'], 'retry-after': '1' });
      response.end(replacing ? 'Build output is being replaced. Retry shortly.' : 'Cannot read build output.');
    }
  });

  const close = () => {
    for (const client of reloadClients) {
      client.end();
    }
    server.close();
    // Keep-alive sockets (and the live-reload streams) would otherwise hold the port
    // long after close(), so the process taking over still hits EADDRINUSE.
    server.closeAllConnections();
  };

  const listen = () =>
    new Promise((resolve, reject) => {
      // Both listeners come off on either outcome: a failed attempt would otherwise
      // leave its 'listening' callback behind and announce the server twice on retry.
      const announce = () => {
        server.off('error', fail);
        onListen?.();
        resolve();
      };
      const fail = (error) => {
        server.off('listening', announce);
        reject(error);
      };

      server.once('error', fail);
      // Loopback only: a dev build is not for the rest of the network.
      server.listen(port, '127.0.0.1', announce);
    });

  for (let attempt = 0; ; attempt += 1) {
    try {
      await listen();
      break;
    } catch (error) {
      // A previous dev run owns the port: ask it to stand down, and if it is not
      // answering any more, kill whatever is still holding the port.
      if (error.code !== 'EADDRINUSE' || attempt > 2) {
        throw error;
      }

      if (!(await takeOver(port)) && !(await killPort(port))) {
        throw error; // someone else's server — reported by killPort
      }

      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }

  return {
    close,
    reload() {
      for (const client of reloadClients) {
        client.write('data: reload\n\n');
      }
    },
  };
}

async function takeOver(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}${TAKEOVER_PATH}`, {
      method: 'POST',
      signal: AbortSignal.timeout(500),
    });
    return response.status === 204 && response.headers.get('x-jamshoot-server') === '1';
  } catch {
    return false;
  }
}

/**
 * Kills the runners listening on `port` — the last resort when takeover got no answer,
 * because a frozen or half-dead process cannot answer for itself.
 *
 * It only ever kills one of these runners, owned by this user: 4173 is a popular port
 * (it is `vite preview`'s default), and someone else's server on it is not ours to
 * stop. Returns false when a stranger holds the port, so the caller can say so.
 */
async function killPort(port) {
  let pids = [];

  try {
    const { stdout } = await run('lsof', ['-t', `-iTCP:${port}`, '-sTCP:LISTEN']);
    pids = stdout.split('\n').filter(Boolean).map(Number);
  } catch {
    return true; // no lsof, or nobody listening any more
  }

  for (const pid of pids) {
    // Only ever a real, single process: kill(0) signals the whole process group and
    // kill(-1) every process this user owns, so a stray NaN here would be a disaster.
    if (!Number.isInteger(pid) || pid <= 0 || pid === process.pid) {
      continue;
    }

    const holder = await describe(pid);

    if (!ours(holder)) {
      console.error(
        `\n  port ${port} is held by pid ${pid}${holder ? ` (${holder.user}: ${holder.command})` : ''},` +
          ` which is not a ${PACKAGE} runner — leaving it alone.` +
          `\n  Stop it yourself, or run with --port <other>.\n`,
      );
      return false;
    }

    console.log(`  port ${port} was held by pid ${pid} — stopping it`);

    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      continue;
    }

    await new Promise((resolve) => setTimeout(resolve, 200));

    // Identity is checked again: the pid may have died and been reused in the meantime,
    // and SIGKILL to a recycled pid would hit a process that was never ours.
    if (!ours(await describe(pid))) {
      continue;
    }

    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // already gone
    }
  }

  return true;
}

/** Whether a described process is one of this user's own runners. */
function ours(holder) {
  return Boolean(holder) && holder.user === userInfo().username && OUR_RUNNER.test(holder.command);
}

/** The owner and command line of a pid, or null if it is gone or unreadable. */
async function describe(pid) {
  try {
    const { stdout } = await run('ps', ['-o', 'user=,command=', '-p', String(pid)]);
    const [, user, command] = stdout.trim().match(/^(\S+)\s+(.*)$/s) ?? [];
    return command ? { user, command: command.trim() } : null;
  } catch {
    return null;
  }
}

/** Build once, watch, serve. Both runners are a few lines of configuration around this. */
export async function runner({ label, root, port, build, watching }) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error(`\n  --port needs a number from 1 to 65535\n`);
    process.exit(1);
  }

  let server;
  const watcher = watchPaths(watching, async () => {
    if (await build()) server?.reload();
  }, { initial: true });
  try {
    await watcher.ready;
    server = await serveDirectory({
      root,
      port,
      onTakeover: () => watcher.close(),
      onListen: () => {
        console.log(`\n  ${label}\n  http://127.0.0.1:${port}\n\n  watching for changes — live reload enabled\n`);
      },
    });
    return {
      close() { watcher.close(); server.close(); },
    };
  } catch (error) {
    watcher.close();
    throw error;
  }
}
