// Toddler Keyboard — Service Worker
// Caches the app shell on install, serves from cache first, falls back to network.
// Sound files (.ogg) are cached as they're fetched — no need to list them upfront.

const CACHE = 'toddler-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './favicon.ico',
];

// Install — cache the app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate — delete old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — cache-first for everything
self.addEventListener('fetch', e => {
  // Only handle GET requests on our own origin
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      // Not in cache — fetch from network and cache it (covers .ogg files)
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type === 'error') return res;
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => {
        // Network failed and not in cache — nothing we can do
        return new Response('Offline', { status: 503 });
      });
    })
  );
});
