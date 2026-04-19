// MovieZone Service Worker for PWA
const CACHE_NAME = 'moviezone-v4';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Don't intercept: non-GET, API calls, or cross-origin requests
  if (event.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.origin !== self.location.origin) return;

  // For navigation requests (HTML pages), always go network-first
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          // cache the page for offline fallback
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('/index.html', clone));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match('/index.html');
          return cached || new Response('<h1>Offline</h1>', { headers: { 'Content-Type': 'text/html' } });
        })
    );
    return;
  }

  // For static assets, cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        // only cache successful responses
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return res;
      });
      // no .catch() — let the browser show its own network error
    })
  );
});
