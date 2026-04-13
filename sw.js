const CACHE = 'mpl-v22';
const ASSETS = [
  '/', '/index.html',
  '/css/app.css?v=22', '/css/themes.css?v=22',
  '/js/data.js?v=22', '/js/log.js?v=22', '/js/screens.js?v=22',
  '/js/rehab.js?v=22', '/js/app.js?v=22',
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
