// Service worker mínimo: casca offline do painel da guarda.
const CACHE = "agsp-shell-v1";
const SHELL = ["/", "/manifest.webmanifest", "/favicon.ico"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  // Rotas de autenticação nunca são cacheadas.
  if (url.pathname.startsWith("/auth") || url.pathname.startsWith("/reset-password")) return;


  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => hit ?? caches.match("/")).then(
          (hit) => hit ?? new Response("Offline", { status: 503 }),
        ),
      ),
  );
});
