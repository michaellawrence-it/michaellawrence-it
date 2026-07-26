/* sw.js — offline shell. Bump CACHE when any file below changes. */

const CACHE = 'ppl-tracker-2026-07-26.4';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './program.js',
  './app.js',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './manifest.webmanifest',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Network-first so a deployed update lands on the next online load, with the
   cache as the fallback when the gym has no signal. */
self.addEventListener('fetch', (ev) => {
  if (ev.request.method !== 'GET') return;
  ev.respondWith(handle(ev.request));
});

async function handle(request) {
  try {
    const res = await fetch(request);

    if (res && res.ok) {
      const copy = res.clone(); // clone now — the page consumes the original
      caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
      return res;
    }

    /* Reachable, but the file isn't being served: Pages switched off, the
       source branch deleted, a half-finished deploy. fetch() RESOLVES for a
       404, so caching here would overwrite a working app with an error page
       and there'd be no way back — not even offline. Keep the good copy. */
    const cached = await caches.match(request);
    return cached || res;
  } catch (err) {
    // Genuinely offline.
    const cached = await caches.match(request);
    if (cached) return cached;

    const shell = await caches.match('./index.html');
    if (shell) return shell;

    return new Response('Offline, and nothing is cached yet.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
