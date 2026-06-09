"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePWAInstall } from "@/lib/use-pwa-install";
import { Icon } from "@/components/ui/icon";

/**
 * Banner del panel admin que invita a INSTALAR la app cuando todavía corre
 * en el navegador (marcador / pestaña) en vez de como PWA instalada.
 *
 * Por qué existe: el push en Android es mucho más confiable con la app
 * instalada, y en iOS es OBLIGATORIO instalarla para recibir notificaciones.
 * El <PWAInstallPrompt/> general está excluido de /admin, así que el dueño
 * nunca veía la invitación — y terminaba agregando un simple marcador (que ni
 * siquiera permite activar las notifs).
 *
 * Tres situaciones:
 *  - Navegador embebido (WhatsApp/Instagram): no se puede instalar ni pedir
 *    push. Le decimos que abra en Chrome.
 *  - Chrome con prompt disponible: botón "Instalar" nativo.
 *  - Resto (prompt no disparado, iOS Safari): instrucciones del menú.
 */

const DISMISS_KEY = "admin-install-banner-dismissed";

function isEmbeddedBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  // WhatsApp/Instagram/Facebook/Line + WebViews genéricos de Android.
  return /FBAN|FBAV|Instagram|Line\/|Twitter|GSA\/|; wv\)|WebView/i.test(ua);
}

export function AdminInstallBanner() {
  const { canInstall, isInstalled, install, isInstalling } = usePWAInstall();
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [embedded, setEmbedded] = useState(false);

  useEffect(() => {
    setMounted(true);
    setEmbedded(isEmbeddedBrowser());
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      // sessionStorage puede fallar en modo incógnito de algunos webviews.
    }
  }, []);

  // Instalada (standalone) → nada que mostrar. También respetamos el dismiss.
  if (!mounted || isInstalled || dismissed) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* noop */
    }
    setDismissed(true);
  };

  let body: string;
  let cta: React.ReactNode = null;

  if (embedded) {
    body =
      "Abrí turno1min.app en Chrome (no desde WhatsApp/Instagram) para instalar la app y recibir avisos de turnos.";
  } else if (canInstall) {
    body = "Instalá la app para que te avise al instante cuando alguien reserve.";
    cta = (
      <button
        onClick={install}
        disabled={isInstalling}
        className="press-fx flex-shrink-0 rounded-[8px] px-[12px] py-[7px] text-[12px] font-semibold disabled:opacity-60"
        style={{ background: "var(--bg)", color: "var(--ink-1)", border: 0, cursor: "pointer" }}
        type="button"
      >
        {isInstalling ? "..." : "Instalar"}
      </button>
    );
  } else {
    body =
      "Para recibir avisos, instalá la app desde el menú del navegador (⋮ → Instalar aplicación).";
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className="flex-shrink-0 overflow-hidden"
      >
        <div
          className="flex items-center gap-[10px] mx-[12px] mt-[10px] px-[12px] py-[10px] rounded-[12px]"
          style={{ background: "var(--ink-1)", color: "var(--bg)" }}
        >
          <div className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent)" }}>
            <Icon name={embedded ? "alert" : "download"} size={15} color="var(--bg)" />
          </div>
          <p className="flex-1 min-w-0 text-[12px] leading-[1.35] m-0">{body}</p>
          {cta}
          <button
            onClick={dismiss}
            aria-label="Cerrar"
            className="flex-shrink-0 w-[22px] h-[22px] rounded-full flex items-center justify-center opacity-70 hover:opacity-100"
            style={{ background: "transparent", border: 0, cursor: "pointer" }}
            type="button"
          >
            <Icon name="close" size={12} color="var(--bg)" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
