const CACHE_NAME = 'tin9-bai6-a1ab9736';
const VIDEO = './BAI_6_THUC_HANH_PHAN_MEM_MO_PHONG.mp4';
const CORE_ASSETS = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', VIDEO];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME)
    .then(cache => Promise.allSettled(CORE_ASSETS.map(url => cache.add(url))))
    .then(() => self.skipWaiting()));
});

// Chỉ dọn kho lưu của CHÍNH bài này (kho lưu dùng chung cả tên miền github.io)
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('tin9-bai6-') && k !== CACHE_NAME).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function rangeResponse(request, response) {
  const range = request.headers.get('range');
  if (!range || !response) return response;
  return response.arrayBuffer().then(buffer => {
    const size = buffer.byteLength;
    const m = /bytes=(\d+)-(\d*)/.exec(range);
    if (!m) return response;
    const start = Number(m[1]);
    const end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
    if (start >= size) return new Response(null, {status: 416, headers: {'Content-Range': `bytes */${size}`}});
    const chunk = buffer.slice(start, end + 1);
    const headers = new Headers(response.headers);
    headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
    headers.set('Content-Length', String(chunk.byteLength));
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Content-Type', 'video/mp4');
    return new Response(chunk, {status: 206, statusText: 'Partial Content', headers});
  });
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith(VIDEO.slice(1))) {
    event.respondWith(caches.open(CACHE_NAME).then(cache => cache.match(VIDEO).then(cached => {
      if (cached) return rangeResponse(request, cached.clone());
      return fetch(request).then(network => {
        if (network.ok && !request.headers.get('range')) cache.put(VIDEO, network.clone());
        return network;
      });
    })));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(network => {
    if (network.ok) { const copy = network.clone(); caches.open(CACHE_NAME).then(cache => cache.put(request, copy)); }
    return network;
  }).catch(() => caches.match('./index.html'))));
});
