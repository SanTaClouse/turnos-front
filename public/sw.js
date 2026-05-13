const CACHE_NAME = "turno1min-v2";
const urlsToCache = [
  "/",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }

      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type === "error") {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    }).catch(() => {
      return caches.match("/");
    })
  );
});

// Push notifications: el backend envía webpush.sendNotification() con
// payload JSON {title, body, icon, badge, tag, data}. Sin este handler,
// el navegador recibe el mensaje pero no muestra nada al admin.
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Nuevo turno", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Turno1Min";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/icon-192.png",
    badge: payload.badge || "/icon-192.png",
    tag: payload.tag || "turno1min-notification",
    data: payload.data || {},
    requireInteraction: true,
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Al hacer click en la notif, abrir/focusear la agenda del admin.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = "/admin/agenda";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        const adminWin = windowClients.find((w) => w.url.includes("/admin"));
        if (adminWin) {
          return adminWin.focus();
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
