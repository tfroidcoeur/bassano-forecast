// Service worker: stale-while-revalidate for the app shell, network-first with cache fallback for data.
// The shell is refreshed in the background, so a new deploy reaches the next load even without a bump.
// Bump SHELL_VERSION when the cache layout changes; the activate step removes older caches.
const SHELL_VERSION = 'v8';
const SHELL_CACHE = `grappa-shell-${SHELL_VERSION}`;
const DATA_CACHE = `grappa-data-${SHELL_VERSION}`;

const SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './lib/config.js',
  './lib/urls.js',
  './lib/time.js',
  './lib/wind.js',
  './lib/score.js',
  './lib/model.js',
  './lib/foehn.js',
  './lib/forecast-json.js',
  './lib/longrange.js',
  './lib/layout.js',
  './lib/status.js',
  './lib/chart.js',
  './lib/icons.js',
  './ui/dom.js',
  './ui/chart.js',
  './ui/hourly.js',
  './ui/longrange.js',
  './ui/models.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

const DATA_HOSTS = new Set([
  'api.open-meteo.com',
  'ensemble-api.open-meteo.com',
  'api.github.com',
  'raw.githubusercontent.com',
]);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== DATA_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (DATA_HOSTS.has(url.hostname)) {
    event.respondWith(networkFirst(req));
  } else if (url.origin === self.location.origin) {
    event.respondWith(shellResponse(event, req));
  }
});

// Serve the cached copy at once and fetch in the background to update it. A miss waits for the network.
async function shellResponse(event, req) {
  const cache = await caches.open(SHELL_CACHE);
  const hit = await cache.match(req);
  const update = fetch(req).then(async (res) => {
    if (res.ok) await cache.put(req, res.clone());
    return res;
  });
  if (hit) {
    event.waitUntil(update.catch(() => {}));
    return hit;
  }
  return update;
}

async function networkFirst(req) {
  const cache = await caches.open(DATA_CACHE);
  let res;
  try {
    res = await fetch(req);
  } catch (err) {
    const stored = await cache.match(req);
    if (stored) return stored;
    throw err;
  }
  if (res.ok) {
    // Stored copy carries the time it was fetched, and CORS headers so the page can read it.
    const headers = new Headers({
      'Content-Type': res.headers.get('Content-Type') || 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'X-Cached-At',
      'X-Cached-At': String(Date.now()),
    });
    const body = await res.clone().blob();
    await cache.put(req, new Response(body, { status: 200, headers }));
    return res;
  }
  // Rate limit or server error: the stored copy, with its old X-Cached-At, shows the offline banner.
  // Anything else (e.g. 404, the verdict file is gone) is passed on, so no stale verdict lingers.
  if (res.status !== 429 && res.status < 500) return res;
  const stored = await cache.match(req);
  return stored || res;
}
