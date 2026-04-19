// SELF-DESTRUCT SERVICE WORKER
// The previous SW was caching old code on iPad/iOS Safari, blocking updates.
// This version: on activation, clears all caches, unregisters itself, and reloads
// every controlled client. After this runs once on a device, the SW is gone forever
// and the page always loads fresh from the network.

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    } catch (err) {}
    try { await self.registration.unregister(); } catch (err) {}
    try {
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach(c => { try { c.navigate(c.url); } catch (e) {} });
    } catch (err) {}
  })());
});

// Pass through to network — do NOT cache anything
self.addEventListener("fetch", () => {});
