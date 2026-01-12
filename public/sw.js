// Service Worker pour phdefoy.com
const CACHE_NAME = 'phdefoy-v1';

// Ressources à mettre en cache immédiatement
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.svg',
  '/favicon-32x32.png',
  '/apprendre-le-russe/',
  '/apprendre-espagnol/',
  '/livres/'
];

// Installation : mise en cache des ressources essentielles
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activation : nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Stratégie de fetch
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') return;

  // Ignorer les requêtes externes (analytics, etc.)
  if (url.origin !== self.location.origin) return;

  // Ignorer les requêtes d'API ou de tracking
  if (url.pathname.includes('/api/') || url.pathname.includes('gtag')) return;

  event.respondWith(
    // Stratégie : Network first, fallback to cache
    fetch(request)
      .then((response) => {
        // Ne pas cacher les réponses en erreur
        if (!response || response.status !== 200) {
          return response;
        }

        // Cloner la réponse pour la mettre en cache
        const responseToCache = response.clone();

        caches.open(CACHE_NAME)
          .then((cache) => {
            // Cacher les pages HTML et assets statiques
            if (request.destination === 'document' ||
                request.destination === 'style' ||
                request.destination === 'script' ||
                request.destination === 'image' ||
                request.destination === 'font') {
              cache.put(request, responseToCache);
            }
          });

        return response;
      })
      .catch(() => {
        // En cas d'erreur réseau, utiliser le cache
        return caches.match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }

            // Page offline de secours pour les documents
            if (request.destination === 'document') {
              return caches.match('/');
            }

            return new Response('Offline', { status: 503 });
          });
      })
  );
});
