/* Iron Chin Mobility — service worker for offline use.
   After one online launch, the app runs fully offline (incl. airplane mode).
   Bump CACHE (v1 → v2 …) if you ever need to force every phone to refetch. */
const CACHE = "ironchin-v1";

// Cached at install so the app shell is available offline immediately.
const PRECACHE = [
  "./", "./index.html", "./manifest.json",
  "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png",
  // third-party libraries the app loads (cross-origin, cached opaquely)
  "https://unpkg.com/react@18/umd/react.production.min.js",
  "https://unpkg.com/react-dom@18/umd/react-dom.production.min.js",
  "https://unpkg.com/@babel/standalone@7/babel.min.js",
  "https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap",
];

self.addEventListener("install", (e) => {
  // allSettled: one failed fetch won't abort the whole install
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(PRECACHE.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const sameOrigin = new URL(req.url).origin === self.location.origin;

  // HTML pages: network-first → newest version when online, cached copy when offline.
  if (req.mode === "navigate" || (sameOrigin && req.destination === "document")) {
    e.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
        .catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  // Everything else (libraries, fonts, icons): cache-first, fall back to network and cache it.
  e.respondWith(
    caches.match(req).then((cached) =>
      cached || fetch(req).then((res) => {
        const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res;
      }).catch(() => cached)
    )
  );
});
