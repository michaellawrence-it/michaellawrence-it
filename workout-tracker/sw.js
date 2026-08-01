/* sw.js — offline shell. Bump CACHE when any file below changes. */

const CACHE = 'ppl-tracker-2026-07-26.18';
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

/* A scheduled reminder arriving from the push server. iOS requires that every
   push shows a notification, so there is no silent path here by design. */
self.addEventListener('push', (ev) => {
  const fallback = { title: 'PPL Tracker', body: 'Time to train.', url: './index.html#/home' };
  let data = fallback;
  if (ev.data) {
    try { data = { ...fallback, ...ev.data.json() }; }
    catch (err) { data = { ...fallback, body: ev.data.text() }; }
  }
  ev.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    tag: 'ppl-reminder',
    renotify: true,
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    data: { url: data.url },
  }));
});

/* Tapping a notification should land you back in the app, reusing the window
   that's already open rather than stacking up new ones. */
self.addEventListener('notificationclick', (ev) => {
  ev.notification.close();
  const target = (ev.notification.data && ev.notification.data.url) || './index.html';
  ev.waitUntil((async () => {
    const url = new URL(target, self.registration.scope).href;
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of clients) {
      if (c.url.startsWith(self.registration.scope)) {
        await c.focus();
        if ('navigate' in c && c.url !== url) await c.navigate(url).catch(() => {});
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
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
