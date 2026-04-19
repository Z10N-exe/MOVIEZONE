// MovieZone Service Worker for PWA
const CACHE_NAME = 'moviezone-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Skip non-http/https schemes (e.g. chrome-extension, data:)
  if (!(event.request.url.startsWith('http'))) return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response;

      return fetch(event.request).catch(err => {
        console.warn('Fetch failed for:', event.request.url, err);
        // Fallback or just return null to let browser handle it
        return null; 
      });
    })
  );
});
