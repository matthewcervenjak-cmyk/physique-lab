// v4 — busts all previous caches on install
const CACHE = 'mpl-v12';
const ASSETS = [
  '/?v=12',
  '/index.html',
  '/css/app.css?v=12',
  '/css/themes.css?v=12',
  '/js/data.js?v=12',
  '/js/screens.js?v=12',
  '/js/rehab.js?v=12',
  '/js/app.js?v=12',
  '/manifest.json',
  '/icons/logo.png',
  '/icons/jarjar.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(e.request)
          .then(res => {
            // Cache fresh copies of our assets
            if (res.ok && e.request.url.includes(self.location.origin)) {
              const clone = res.clone();
              caches.open(CACHE).then(c => c.put(e.request, clone));
            }
            return res;
          })
          .catch(() => caches.match('/index.html'));
      })
  );
});
