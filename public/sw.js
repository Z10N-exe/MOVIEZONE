self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // ❌ Never cache video or downloads
  if (
    url.pathname.includes('/api/download') ||
    url.pathname.includes('/api/stream') ||
    url.pathname.includes('/api/sources')
  ) {
    return event.respondWith(fetch(event.request));
  }

  // 🔎 Search → always fresh
  if (url.pathname.includes('/api/search')) {
    return event.respondWith(fetch(event.request));
  }

  // ⚡ Cache important API responses
  event.respondWith(
    caches.match(event.request).then(cacheRes => {
      return (
        cacheRes ||
        fetch(event.request).then(networkRes => {
          return caches.open('moviezone-cache-v1').then(cache => {
            cache.put(event.request, networkRes.clone());
            return networkRes;
          });
        })
      );
    })
  );
});