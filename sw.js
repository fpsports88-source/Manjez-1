/* © YS — جميع الحقوق محفوظة */
const CACHE = 'munjiz-v1.0.0';
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k.startsWith('munjiz-') && k !== CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

function isFirebaseApi(url) {
  return (
    url.hostname.endsWith('.googleapis.com') ||
    url.hostname.endsWith('.firebaseio.com') ||
    url.hostname === 'accounts.google.com' ||
    url.hostname === 'identitytoolkit.googleapis.com' ||
    url.hostname === 'securetoken.googleapis.com' ||
    url.hostname === 'firebaselogging-pa.googleapis.com' ||
    url.pathname.includes('/google.identity.')
  );
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // لا تتدخل في طلبات Firebase/API
  if (isFirebaseApi(url)) return;

  // صفحة المالك لا تمر عبر الكاش
  if (url.pathname.endsWith('/admin.html')) return;

  // الصفحات: الشبكة أولًا ثم الكاش
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // أصول نفس الأصل + مكتبات Firebase CDN: كاش أولًا
  if (
    url.origin === self.location.origin ||
    url.hostname === 'www.gstatic.com'
  ) {
    event.respondWith(
      caches.match(req).then(cached => {
        const fetchPromise = fetch(req).then(res => {
          if (res && res.status === 200 && res.type !== 'opaque') {
            const copy = res.clone();
            caches.open(CACHE).then(cache => cache.put(req, copy));
          }
          return res;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});