const CACHE_NAME = 'elpris-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/script.js',
    '/manifest.json',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// Add preference cache name
const PREFERENCES_CACHE = 'elpris-preferences-v1';

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        Promise.all([
            caches.open(CACHE_NAME)
                .then((cache) => cache.addAll(STATIC_ASSETS)),
            // Initialize preferences cache
            caches.open(PREFERENCES_CACHE)
                .then((cache) => cache.put('preferences', new Response(JSON.stringify({
                    region: 'SE3' // Default value
                }))))
        ])
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME && name !== PREFERENCES_CACHE)
                    .map((name) => caches.delete(name))
            );
        })
    );
});

// Add message handler for preferences
self.addEventListener('message', async (event) => {
    if (event.data.type === 'SET_REGION') {
        const cache = await caches.open(PREFERENCES_CACHE);
        const preferences = await cache.match('preferences')
            .then(response => response ? response.json() : {})
            .catch(() => ({}));
        
        preferences.region = event.data.region;
        
        await cache.put('preferences', new Response(JSON.stringify(preferences)));
        // Respond to confirm the update
        event.ports[0].postMessage({ success: true });
    }
});

// Fetch event - network first strategy
self.addEventListener('fetch', (event) => {
    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin) && 
        !event.request.url.includes('elprisetjustnu.se')) {
        return;
    }

    // Network first strategy for API calls
    if (event.request.url.includes('elprisetjustnu.se')) {
        event.respondWith(
            fetch(event.request)
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Cache first strategy for static assets
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request)
                    .then((response) => {
                        // Add cache control headers for HTML and CSS files
                        if (response.status === 200 && 
                            (event.request.url.endsWith('.html') || 
                             event.request.url.endsWith('.css'))) {
                            const newHeaders = new Headers(response.headers);
                            newHeaders.append('Cache-Control', 'no-cache, no-store, must-revalidate');
                            newHeaders.append('Pragma', 'no-cache');
                            newHeaders.append('Expires', '0');
                            
                            response = new Response(response.body, {
                                status: response.status,
                                statusText: response.statusText,
                                headers: newHeaders
                            });
                        }
                        
                        // Cache new static assets
                        if (response.status === 200) {
                            const responseClone = response.clone();
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseClone);
                                });
                        }
                        return response;
                    });
            })
    );
}); 