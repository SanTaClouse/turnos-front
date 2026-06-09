import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/**
 * Convierte la VAPID public key (base64url) a Uint8Array.
 *
 * IMPORTANTE: pasar la key como string crudo a pushManager.subscribe()
 * funciona en Chrome desktop pero FALLA en varios Android con
 * "InvalidAccessError: applicationServerKey is not valid". El array de bytes
 * es el formato que funciona en todos lados.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  // Alocamos sobre un ArrayBuffer explícito para que el tipo sea
  // Uint8Array<ArrayBuffer> (BufferSource válido para applicationServerKey).
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export function usePushNotifications(tenantId: string | null) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!tenantId) return;

    const init = async () => {
      // Verificar soporte de notificaciones
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        return;
      }

      // Obtener permiso actual
      setPermission(Notification.permission);

      try {
        // Registrar o obtener service worker
        const registration = await navigator.serviceWorker.ready;

        // Verificar si ya está suscrito
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);

        // Si está suscrito, notificar al backend
        if (subscription) {
          await savePushSubscription(tenantId, subscription);
        }
      } catch (error) {
        console.error("Error initializing push notifications:", error);
      }
    };

    init();
  }, [tenantId]);

  const requestPermission = async () => {
    // Soporte: en navegadores embebidos (WhatsApp/Instagram) y en iOS sin
    // "Agregar a pantalla de inicio", PushManager no existe. Avisamos en vez
    // de fallar mudo, así el usuario sabe qué hacer.
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      alert(
        "Tu navegador no soporta notificaciones acá. Abrí el sitio en Chrome (no desde WhatsApp/Instagram) e instalá la app desde el menú ⋮ → Instalar aplicación.",
      );
      return false;
    }

    if (!tenantId) return false;

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      // Falta la variable en el build de producción → nadie puede suscribirse.
      console.error("NEXT_PUBLIC_VAPID_PUBLIC_KEY no está definida en el build");
      alert("Las notificaciones no están configuradas en el servidor. Avisale al soporte.");
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission === "denied") {
        // El usuario (o un "bloquear" previo) dejó el permiso denegado. El
        // prompt ya no vuelve a aparecer hasta que lo resetee a mano.
        alert(
          "Las notificaciones están bloqueadas para este sitio. Tocá el candado 🔒 junto a la dirección → Notificaciones → Permitir, y volvé a intentar.",
        );
        return false;
      }

      if (permission !== "granted") {
        // "default": cerró el prompt sin elegir. Sin alert, puede reintentar.
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      // Guardar en backend
      await savePushSubscription(tenantId, subscription);
      setIsSubscribed(true);
      return true;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      alert("No se pudieron activar las notificaciones. Probá cerrar y reabrir la app, o instalarla desde Chrome.");
      return false;
    }
  };

  return {
    permission,
    isSubscribed,
    requestPermission,
  };
}

async function savePushSubscription(tenantId: string, subscription: PushSubscription) {
  try {
    // IMPORTANTE: usar toJSON(), NO getKey().
    // getKey() devuelve ArrayBuffer y JSON.stringify lo serializa como {}
    // — el backend termina guardando keys vacías y web-push falla en silencio.
    // toJSON() devuelve { endpoint, keys: { p256dh, auth } } como base64url
    // strings, que es exactamente lo que necesita web-push.
    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      console.error("Push subscription missing endpoint or keys", json);
      return;
    }
    await api.post("/notifications/subscribe", {
      tenant_id: tenantId,
      subscription: {
        endpoint: json.endpoint,
        keys: {
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        },
      },
    });
  } catch (error) {
    console.error("Error saving push subscription:", error);
  }
}
