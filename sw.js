// v4 — busts all previous caches on install
const CACHE = 'mpl-v11';
const ASSETS = [
  '/?v=11',
  '/index.html',
  '/css/app.css?v=11',
  '/css/themes.css?v=11',
  '/js/data.js?v=11',
  '/js/screens.js?v=11',
  '/js/rehab.js?v=11',
  '/js/app.js?v=11',
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
