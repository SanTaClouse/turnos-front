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

/**
 * ¿La suscripción existente fue creada con la VAPID key vigente?
 *
 * Si la key pública rotó (cambio de env en el build), la suscripción vieja
 * queda inservible: FCM responde 403 "VAPID credentials do not correspond..."
 * y Apple 400 VapidPkHashMismatch, y las push NUNCA llegan. Detectamos el
 * mismatch para darla de baja y re-suscribir con la key actual.
 */
function subscriptionMatchesKey(
  subscription: PushSubscription,
  vapidKey: Uint8Array,
): boolean {
  const raw = subscription.options?.applicationServerKey;
  if (!raw) return true; // no se puede verificar — asumimos que está bien
  const current = new Uint8Array(raw);
  if (current.length !== vapidKey.length) return false;
  return current.every((byte, i) => byte === vapidKey[i]);
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
        let subscription = await registration.pushManager.getSubscription();

        // Auto-reparación 1: si la suscripción quedó atada a una VAPID key
        // vieja, la damos de baja y creamos una nueva con la key vigente
        // (solo si el permiso ya está dado — acá no podemos pedirlo).
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        const currentKey = vapidKey ? urlBase64ToUint8Array(vapidKey) : null;

        if (subscription && currentKey) {
          if (!subscriptionMatchesKey(subscription, currentKey)) {
            console.warn("Push subscription con VAPID key vieja — re-suscribiendo");
            await subscription.unsubscribe();
            subscription =
              Notification.permission === "granted"
                ? await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: currentKey,
                  })
                : null;
          }
        }

        // Auto-reparación 2: la VAPID key puede coincidir y la suscripción
        // seguir muerta — el push service la dio de baja y el browser no se
        // enteró. Solo el backend lo sabe, así que se lo preguntamos al
        // guardarla; si dice que está muerta, re-suscribimos con un endpoint
        // nuevo. Sin esto las push no vuelven nunca sin intervención manual.
        if (subscription && currentKey) {
          subscription = await resubscribeIfDead(
            tenantId,
            registration,
            subscription,
            currentKey,
          );
        } else if (subscription) {
          await savePushSubscription(tenantId, subscription);
        }

        setIsSubscribed(!!subscription);
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
      const currentKey = urlBase64ToUint8Array(vapidKey);

      // Si hay una suscripción vieja con otra VAPID key, subscribe() tiraría
      // InvalidStateError. La damos de baja primero.
      const existing = await registration.pushManager.getSubscription();
      if (existing && !subscriptionMatchesKey(existing, currentKey)) {
        await existing.unsubscribe();
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: currentKey,
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

/**
 * Guarda la suscripción en el backend.
 *
 * Devuelve `true` si el backend la aceptó, o `false` si respondió que ese
 * endpoint ya está muerto (el push service lo dio de baja con 410). Ese `false`
 * es la señal para re-suscribir: ver `resubscribeIfDead`.
 */
async function savePushSubscription(
  tenantId: string,
  subscription: PushSubscription,
): Promise<boolean> {
  try {
    // IMPORTANTE: usar toJSON(), NO getKey().
    // getKey() devuelve ArrayBuffer y JSON.stringify lo serializa como {}
    // — el backend termina guardando keys vacías y web-push falla en silencio.
    // toJSON() devuelve { endpoint, keys: { p256dh, auth } } como base64url
    // strings, que es exactamente lo que necesita web-push.
    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      console.error("Push subscription missing endpoint or keys", json);
      return false;
    }
    const res = await api.post<{ dead?: boolean }>("/notifications/subscribe", {
      tenant_id: tenantId,
      subscription: {
        endpoint: json.endpoint,
        keys: {
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        },
      },
    });
    return !res?.dead;
  } catch (error) {
    console.error("Error saving push subscription:", error);
    return false;
  }
}

/**
 * Rompe el bucle de "suscripción zombie".
 *
 * Cuando el push service da de baja un endpoint (410 Gone), el backend se
 * entera pero el browser NO: sigue devolviendo la misma PushSubscription local
 * para siempre. Sin esto, cada carga del admin la volvía a guardar, el backend
 * la volvía a marcar muerta al primer envío, y las push no llegaban nunca más
 * — en silencio, sin que el dueño viera nada raro (el toggle seguía "activado").
 *
 * La única salida es unsubscribe() + subscribe(): eso fuerza un endpoint nuevo.
 */
async function resubscribeIfDead(
  tenantId: string,
  registration: ServiceWorkerRegistration,
  subscription: PushSubscription,
  vapidKey: Uint8Array<ArrayBuffer>,
): Promise<PushSubscription | null> {
  const accepted = await savePushSubscription(tenantId, subscription);
  if (accepted) return subscription;

  if (Notification.permission !== "granted") return null;

  console.warn("Push subscription dada de baja por el push service — re-suscribiendo");
  try {
    await subscription.unsubscribe();
    const fresh = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKey,
    });
    await savePushSubscription(tenantId, fresh);
    return fresh;
  } catch (error) {
    console.error("Error re-suscribiendo push:", error);
    return null;
  }
}
