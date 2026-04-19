const CACHE = "hometasks-v7";
const ASSETS = ["./manifest.json", "./icon.svg"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

// Network-first for HTML/JS so admin changes propagate immediately.
// Cache-first for static assets (manifest, icon).
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const isCode = url.pathname.endsWith(".html") || url.pathname.endsWith(".js") || url.pathname === "/" || url.pathname.endsWith("/HomeTasks/") || url.pathname.endsWith("/HomeTasks");

  if (isCode) {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(e.request).then(hit => hit || caches.match("./index.html")))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      }))
    );
  }
});
