import { useEffect, useState } from "react";
import { api } from "@/lib/api";

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
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.log("Push notifications not supported");
      return false;
    }

    if (!tenantId) return false;

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission === "granted") {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        });

        // Guardar en backend
        await savePushSubscription(tenantId, subscription);
        setIsSubscribed(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
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
    await api.post("/notifications/subscribe", {
      tenant_id: tenantId,
      subscription: {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.getKey("p256dh"),
          auth: subscription.getKey("auth"),
        },
      },
    });
  } catch (error) {
    console.error("Error saving push subscription:", error);
  }
}
