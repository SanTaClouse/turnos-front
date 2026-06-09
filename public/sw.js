// SW v3:
//  - Cachea SOLO assets estáticos same-origin (iconos, fuentes, _next/static/).
//  - NO toca peticiones a la API (cross-origin) ni documentos HTML — esas
//    van directo a la red. Esto evita el bug del v2 que servía respuestas
//    rancias de /appointments y rompía el polling de la agenda.
//  - Mantiene los handlers de push / notificationclick para que el admin
//    reciba notificaciones cuando se crea un turno.

const CACHE_NAME = "turno1min-v4";
const PRECACHE_URLS = ["/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) return caches.delete(name);
        }),
      ),
    ),
  );
  self.clients.claim();
});

// Decide si una petición es un asset estático seguro de cachear.
function isStaticAsset(url) {
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/_next/static/")) return true;
  if (url.pathname === "/manifest.json") return true;
  return /\.(?:png|jpe?g|gif|svg|webp|ico|woff2?|ttf|otf|eot)$/i.test(
    url.pathname,
  );
}

self.addEventListener("fetch", (event) => {
  // Solo GETs — POST/PATCH/DELETE NUNCA se cachean.
  if (event.request.method !== "GET") return;

  let url;
  try {
    url = new URL(event.request.url);
  } catch {
    return;
  }

  // API cross-origin, documentos HTML, navegaciones, Next data:
  // todo pasa derecho a la red. NO llamamos a respondWith, así el
  // browser maneja la petición como si el SW no existiera.
  if (!isStaticAsset(url)) return;

  // Stale-while-revalidate para assets estáticos.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type !== "error") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    }),
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
  const data = payload.data || {};

  // Botón "Confirmar" directo en la notif. Solo lo mostramos en notifs de
  // turno nuevo (las que traen appointmentId + apiBase para poder confirmar).
  const actions =
    data.appointmentId && data.apiBase
      ? [{ action: "confirm", title: "✓ Confirmar turno" }]
      : [];

  const options = {
    body: payload.body || "",
    icon: payload.icon || "/icon-192.png",
    badge: payload.badge || "/badge.png",
    tag: payload.tag || "turno1min-notification",
    data,
    actions,
    requireInteraction: true,
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Confirma el turno llamando al backend (endpoint público, no necesita sesión)
// y, si sale bien, muestra una segunda notif con el botón "Enviar WhatsApp".
async function confirmAppointment(data) {
  try {
    const res = await fetch(
      `${data.apiBase}/appointments/${data.appointmentId}/confirm`,
      { method: "PATCH" },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    await self.registration.showNotification("Turno confirmado ✓", {
      body: data.waUrl
        ? "Se envió el correo de confirmación. ¿Querés avisarle por WhatsApp?"
        : "Se envió el correo de confirmación al cliente.",
      icon: "/icon-192.png",
      badge: "/badge.png",
      tag: `${data.appointmentId}-confirmed`,
      data: { waUrl: data.waUrl },
      actions: data.waUrl
        ? [{ action: "whatsapp", title: "Enviar WhatsApp" }]
        : [],
    });
  } catch (err) {
    await self.registration.showNotification("No se pudo confirmar", {
      body: "Probá de nuevo desde la agenda.",
      icon: "/icon-192.png",
      badge: "/badge.png",
      tag: `${data.appointmentId}-confirm-error`,
      data: { url: "/admin/agenda" },
    });
  }
}

// Abre una URL (interna del admin o externa como wa.me), reusando la ventana
// del admin si ya está abierta.
async function openUrl(targetUrl) {
  if (/^https?:\/\//.test(targetUrl)) {
    // URL externa (WhatsApp) — siempre ventana nueva.
    if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    return;
  }
  const windowClients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  const adminWin = windowClients.find((w) => w.url.includes("/admin"));
  if (adminWin) return adminWin.focus();
  if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
}

self.addEventListener("notificationclick", (event) => {
  const data = event.notification.data || {};
  event.notification.close();

  // Botón "Confirmar turno"
  if (event.action === "confirm") {
    event.waitUntil(confirmAppointment(data));
    return;
  }

  // Botón "Enviar WhatsApp" (en la notif de turno confirmado)
  if (event.action === "whatsapp" && data.waUrl) {
    event.waitUntil(openUrl(data.waUrl));
    return;
  }

  // Click en el cuerpo de la notif → abrir agenda (o la url que traiga).
  event.waitUntil(openUrl(data.url || "/admin/agenda"));
});
