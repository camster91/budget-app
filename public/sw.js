const CACHE_NAME = "glowos-v1";
const STATIC_ASSETS = [
  "/",
  "/daily",
  "/transactions",
  "/settings",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(STATIC_ASSETS)
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  // Cache-first for static, network-first for API
  if (e.request.url.includes("/api/")) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
  } else {
    e.respondWith(
      caches.match(e.request).then((cached) => cached || fetch(e.request))
    );
  }
});

self.addEventListener("push", (e) => {
  const data = e.data?.json() ?? {};
  const title = data.title || "GlowOS";
  const options = {
    body: data.body || "Spending alert",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "spending",
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
    data: data.url ? { url: data.url } : undefined,
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = e.notification.data?.url || "/daily";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const focused = clients.find((c) => c.focused);
      if (focused) return focused.navigate(url).then((c) => c?.focus());
      if (clients.length > 0) return clients[0].navigate(url).then((c) => c?.focus());
      return self.clients.openWindow(url);
    })
  );
});
