const CACHE = 'mpl-v20';
const ASSETS = [
  '/', '/index.html',
  '/css/app.css?v=20', '/css/themes.css?v=20',
  '/js/data.js?v=20', '/js/log.js?v=20', '/js/screens.js?v=20',
  '/js/rehab.js?v=20', '/js/app.js?v=20',
  '/manifest.json', '/icons/logo.png', '/icons/jarjar.png',
  '/icons/icon-192.png', '/icons/icon-512.png',
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request).catch(()=>caches.match('/index.html'))));
});
