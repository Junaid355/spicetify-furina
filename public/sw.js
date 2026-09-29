const CACHE_NAME = 'furina-music-v1.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/design-tokens.css',
  '/css/layout.css',
  '/css/components.css',
  '/css/player.css',
  '/js/audio-player.js',
  '/js/offline-storage.js',
  '/js/lyrics-engine.js',
  '/js/spotify-client.js',
  '/js/app.js',
  '/images/furina_salon_music.jpg',
  '/images/furina_ocean_abyss.jpg',
  '/images/furina_opera_tears.jpg',
  '/images/furina_pure_hydro.jpg',
  '/icons/app-icon.jpg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching offline application shell');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Do not cache audio stream ranges in standard cache (handled by IndexedDB blob storage)
  if (e.request.url.includes('/audio/') || e.request.url.includes('/api/')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => {
      return cached || fetch(e.request).catch(() => caches.match('/index.html'));
    })
  );
});
