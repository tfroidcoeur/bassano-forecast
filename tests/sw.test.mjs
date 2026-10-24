// Runs sw.js in node with a fake self, caches and fetch. The worker reads these globals at call time.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const listeners = {};
const keyOf = (req) => (typeof req === 'string' ? req : req.url);
const store = new Map(); // cache name -> Map(url -> Response)

globalThis.self = {
  location: { origin: 'https://app.test' },
  addEventListener: (type, fn) => {
    listeners[type] = fn;
  },
  skipWaiting: () => {},
  clients: { claim: async () => {} },
};
globalThis.caches = {
  async open(name) {
    if (!store.has(name)) store.set(name, new Map());
    const m = store.get(name);
    return {
      match: async (req) => m.get(keyOf(req))?.clone(),
      put: async (req, res) => {
        m.set(keyOf(req), res);
      },
    };
  },
  async match(req) {
    for (const m of store.values()) if (m.has(keyOf(req))) return m.get(keyOf(req)).clone();
    return undefined;
  },
  async keys() {
    return [...store.keys()];
  },
  async delete(name) {
    return store.delete(name);
  },
};

const DATA = 'https://api.open-meteo.com/v1/forecast?latitude=45.82';
const SHELL = 'https://app.test/app.js';
const SHELL_VERSION = readFileSync(new URL('../sw.js', import.meta.url), 'utf8').match(/SHELL_VERSION = '([^']+)'/)[1];
const SHELL_CACHE = `grappa-shell-${SHELL_VERSION}`;

let fetchImpl;
globalThis.fetch = (req) => fetchImpl(req);

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...extra } });
}

function event(url) {
  return {
    request: { url, method: 'GET' },
    responded: null,
    waits: [],
    respondWith(p) {
      this.responded = p;
    },
    waitUntil(p) {
      this.waits.push(p);
    },
  };
}

async function respond(url) {
  const ev = event(url);
  listeners.fetch(ev);
  assert.ok(ev.responded, `handled: ${url}`);
  const res = await ev.responded;
  return { res, ev };
}

before(async () => {
  await import('../sw.js');
  assert.ok(listeners.fetch, 'fetch listener registered');
});

test('data: a not-ok response (429) is replaced by the cached copy, with its X-Cached-At', async () => {
  store.clear();
  fetchImpl = async () => json({ generated_at: 'first' });
  const first = await respond(DATA);
  assert.equal(first.res.status, 200);
  const cachedAt = (await caches.match(DATA)).headers.get('X-Cached-At');
  assert.ok(Number(cachedAt) > 0, 'stored copy carries the time it was fetched');

  fetchImpl = async () => new Response('slow down', { status: 429 });
  const limited = await respond(DATA);
  assert.equal(limited.res.status, 200, 'the cached copy is served, not the 429');
  assert.deepEqual(await limited.res.json(), { generated_at: 'first' });
  assert.equal(limited.res.headers.get('X-Cached-At'), cachedAt, 'the banner time is the old one');
});

test('data: a 5xx with a cached copy also serves the cache', async () => {
  store.clear();
  fetchImpl = async () => json({ v: 1 });
  await respond(DATA);
  fetchImpl = async () => new Response('oops', { status: 503 });
  const { res } = await respond(DATA);
  assert.deepEqual(await res.json(), { v: 1 });
});

test('data: a 404 is passed on even with a cached copy, so a removed verdict does not linger', async () => {
  store.clear();
  fetchImpl = async () => json({ v: 1 });
  await respond(DATA);
  fetchImpl = async () => new Response('gone', { status: 404 });
  const { res } = await respond(DATA);
  assert.equal(res.status, 404);
});

test('data: only ok responses are cached; a not-ok first response is passed through', async () => {
  store.clear();
  fetchImpl = async () => new Response('busy', { status: 429 });
  const { res } = await respond(DATA);
  assert.equal(res.status, 429, 'no cache, so the error reaches the page');
  assert.equal(await caches.match(DATA), undefined, 'nothing stored from a not-ok response');
});

test('data: a network error still falls back to the cache, and rethrows when there is none', async () => {
  store.clear();
  fetchImpl = async () => json({ v: 2 });
  await respond(DATA);
  fetchImpl = async () => {
    throw new TypeError('offline');
  };
  const { res } = await respond(DATA);
  assert.deepEqual(await res.json(), { v: 2 });

  store.clear();
  const ev = event('https://api.github.com/repos/x/contents/data/forecast.json');
  listeners.fetch(ev);
  await assert.rejects(ev.responded, TypeError);
});

test('shell: a cached file is served at once and the cache is updated in the background', async () => {
  store.clear();
  const cache = await caches.open(SHELL_CACHE);
  await cache.put(SHELL, new Response('old app'));
  let calls = 0;
  fetchImpl = async () => {
    calls++;
    return new Response('new app', { status: 200 });
  };
  const { res, ev } = await respond(SHELL);
  assert.equal(await res.text(), 'old app', 'stale copy first');
  assert.equal(ev.waits.length, 1, 'background update kept alive with waitUntil');
  await ev.waits[0];
  assert.equal(calls, 1);
  assert.equal(await (await caches.match(SHELL)).text(), 'new app', 'next load gets the new file');
});

test('shell: a failed background update keeps the cached file and does not throw', async () => {
  store.clear();
  const cache = await caches.open(SHELL_CACHE);
  await cache.put(SHELL, new Response('kept'));
  fetchImpl = async () => {
    throw new TypeError('offline');
  };
  const { res, ev } = await respond(SHELL);
  assert.equal(await res.text(), 'kept');
  await ev.waits[0];
  assert.equal(await (await caches.match(SHELL)).text(), 'kept');
});

test('shell: a not-ok background response does not replace the cached file', async () => {
  store.clear();
  const cache = await caches.open(SHELL_CACHE);
  await cache.put(SHELL, new Response('kept'));
  fetchImpl = async () => new Response('gone', { status: 404 });
  const { ev } = await respond(SHELL);
  await ev.waits[0];
  assert.equal(await (await caches.match(SHELL)).text(), 'kept');
});

test('shell: a miss waits for the network and stores the response', async () => {
  store.clear();
  fetchImpl = async () => new Response('fresh', { status: 200 });
  const { res } = await respond(SHELL);
  assert.equal(await res.text(), 'fresh');
  assert.equal(await (await caches.match(SHELL)).text(), 'fresh');
});

test('other origins are not handled', () => {
  const ev = event('https://example.test/x.js');
  listeners.fetch(ev);
  assert.equal(ev.responded, null);
});

test('the app shell lists every script in lib/ and ui/', () => {
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  for (const dir of ['lib', 'ui']) {
    for (const name of readdirSync(new URL(`../${dir}/`, import.meta.url)).filter((f) => f.endsWith('.js'))) {
      assert.ok(sw.includes(`'./${dir}/${name}'`), `${dir}/${name} is not in SHELL`);
    }
  }
});
