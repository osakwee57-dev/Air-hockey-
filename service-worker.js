
const CACHE_NAME = 'neon-air-hockey-v4';
const ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'index.tsx',
  'App.tsx',
  'constants.ts',
  'types.ts',
  'components/GameCanvas.tsx',
  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@700;800&family=Orbitron:wght@400;900&display=swap',
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use try-catch or individual add to ensure one failing asset doesn't break the whole SW
      return Promise.allSettled(
        ASSETS.map(asset => cache.add(asset))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Cache-first strategy for performance and offline reliability
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      }).catch(() => {
        // Fallback if network fails and not in cache
        return null;
      });
    })
  );
});
