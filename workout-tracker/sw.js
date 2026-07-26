/* sw.js — offline shell. Bump CACHE when any file below changes. */

const CACHE = 'ppl-tracker-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './program.js',
  './app.js',
  './icon.svg',
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
  ev.respondWith(
    fetch(ev.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(ev.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(ev.request).then((hit) => hit || caches.match('./index.html')))
  );
});
