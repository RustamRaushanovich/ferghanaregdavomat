const CACHE_NAME = 'davomat-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/davomat.html',
  '/admin.html',
  '/dashboard.html',
  '/assets/agro_card.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => {
        return res || fetch(e.request);
    })
  );
});
