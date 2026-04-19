const CACHE_NAME = 'moviezone-v5';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    fetch('/index.html')
      .then(res => caches.open(CACHE_NAME).then(cache => cache.put('/index.html', res)))
      .catch(() => {}) // ignore if offline during install
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // skip non-GET and cross-origin
  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // skip API calls — never cache or intercept these
  if (url.pathname.startsWith('/api/')) return;

  // navigation requests — network first, fall back to cached index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('/index.html', clone));
          return res;
        })
        .catch(() => caches.match('/index.html').then(cached =>
          cached || new Response('<!DOCTYPE html><html><body><h2>Offline - please reconnect</h2></body></html>',
            { headers: { 'Content-Type': 'text/html' } })
        ))
    );
    return;
  }

  // static assets — cache first, then network
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (res.ok && !url.pathname.includes('hot-update')) {
          const clone = res.clone(); // clone BEFORE any other use
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return res;
      });
    })
  );
});
