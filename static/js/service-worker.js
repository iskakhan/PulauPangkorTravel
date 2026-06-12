const CACHE_NAME = 'pangkor-tourism-v7';
const ASSETS_TO_CACHE = [
  '/',
  '/static/css/base.css',
  '/static/css/responsive.css',
  '/static/css/styles.css',
  '/static/css/webtheme.css',
  '/static/css/modules/carousel.css',
  '/static/css/modules/social-proof.css',
  '/static/js/app.js',
  '/static/js/api.js',
  '/static/js/auth.js',
  '/static/js/config.js',
  '/static/js/dom.js',
  '/static/js/formatters.js',
  '/static/js/i18n.js',
  '/static/js/location-data.js',
  '/static/js/session.js',
  '/static/js/theme.js',
  '/static/js/ui.js',
  '/static/js/offline.js',
  '/static/js/image-optimizer.js',
  '/static/js/social-proof.js',
];

// Install service worker and cache assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching assets...');
        return cache.addAll(ASSETS_TO_CACHE.filter((url) => url !== '/')).catch((err) => {
          console.warn('[SW] Some assets failed to cache:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate service worker and clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch handler with offline support
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // API data must always be fresh. IndexedDB handles the location offline fallback.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // Static assets: cache-first, network fallback
  event.respondWith(
    caches
      .match(request)
      .then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(request).then((response) => {
          if (response.ok && (url.pathname.endsWith('.js') || url.pathname.endsWith('.css'))) {
            const cache = caches.open(CACHE_NAME);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        });
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          return new Response('Offline - resource not available', { status: 503 });
        });
      })
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      console.log('[SW] Cache cleared');
    });
  }
});
