const CACHE_NAME = 'elpris-v1';
const STATIC_CACHE = [
    '/',
    '/index.html',
    '/styles.css',
    '/script.js',
    '/manifest.json',
    '/favicon.ico',
    '/offline.html',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// Install event - cache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_CACHE))
    );
});

// Fetch event - network first, then cache for API calls
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // If it's an API call (elprisetjustnu.se)
    if (url.hostname === 'www.elprisetjustnu.se') {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Clone the response before caching
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => cache.put(event.request, responseToCache));
                    return response;
                })
                .catch(async () => {
                    // If offline, try to return cached response
                    const cachedResponse = await caches.match(event.request);
                    return cachedResponse || caches.match('/offline.html');
                })
        );
    }
    // For other requests (static assets)
    else {
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    // Return cached version or fetch new version
                    return response || fetch(event.request)
                        .then(response => {
                            // Clone and cache the new response
                            const responseToCache = response.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => cache.put(event.request, responseToCache));
                            return response;
                        })
                        .catch(() => {
                            // If the request is for a page, return the offline page
                            if (event.request.mode === 'navigate') {
                                return caches.match('/offline.html');
                            }
                            return null;
                        });
                })
        );
    }
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
}); 