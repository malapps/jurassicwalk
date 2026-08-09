const CACHE_NAME = 'jurassicwalk-v1';
const ASSETS_TO_CACHE = [
  '/jurassicwalk/',
  '/jurassicwalk/index.html',
  '/jurassicwalk/manifest.json',
  '/jurassicwalk/css/style.css',
  '/jurassicwalk/js/state.js',
  '/jurassicwalk/js/geo.js',
  '/jurassicwalk/js/map.js',
  '/jurassicwalk/js/ui.js',
  '/jurassicwalk/js/app.js',
  '/jurassicwalk/img/arrow.svg',
  '/jurassicwalk/icons/icon-192.png',
  '/jurassicwalk/icons/icon-512.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Install event - cache all assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('[SW] Install complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Cache error:', error);
      })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - cache first, then network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and chrome-extension requests
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('chrome-extension://')) return;

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached response if found
        if (cachedResponse) {
          return cachedResponse;
        }

        // Otherwise fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Cache the new response for future
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              })
              .catch((err) => console.warn('[SW] Cache put error:', err));

            return response;
          })
          .catch((error) => {
            console.warn('[SW] Fetch failed, returning offline page if available:', error);
            // Could return an offline fallback page here
          });
      })
  );
});