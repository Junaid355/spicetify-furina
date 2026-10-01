// Furina Music — Service Worker v7.4 (Network-First Strategy)
const CACHE_NAME = 'furina-music-v7.4';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/design-tokens.css',
  '/css/layout.css',
  '/css/components.css',
  '/css/animations.css',
  '/css/player.css',
  '/js/bug-logger.js',
  '/js/motion-3d.js',
  '/js/dynamic-bg.js',
  '/js/audio-player.js',
  '/js/offline-storage.js',
  '/js/lyrics-engine.js',
  '/js/spotify-client.js',
  '/js/marketplace.js',
  '/js/app.js',
  '/images/furina_dance.gif',
  '/images/furina_focalors.gif',
  '/images/furina_salon_music.jpg',
  '/images/furina_ocean_abyss.jpg',
  '/images/furina_opera_tears.jpg',
  '/images/furina_pure_hydro.jpg',
  '/icons/app-icon.jpg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching static assets for v4.0');
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[SW] Some assets failed to pre-cache:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Evicting outdated cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache API routes or dynamic stream resolvers
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/audio/') || event.request.method !== 'GET') {
    return;
  }

  // Network-First Strategy: always fetch fresh version from server
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache when offline
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html');
          }
        });
      })
  );
});
