const CACHE_NAME = 'davomat-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/davomat.html',
    '/dashboard.html',
    '/style.css',
    '/script.js',
    '/logo.png',
    'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
