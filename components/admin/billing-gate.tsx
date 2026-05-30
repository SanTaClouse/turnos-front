"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, AlertTriangle, X } from "lucide-react";
import { Btn } from "@/components/ui/btn";
import { createSubscriptionAction } from "@/app/actions";
import type { BillingStatus } from "@/types/api";

function daysLeft(graceUntil: string | null): number {
  if (!graceUntil) return 0;
  const ms = new Date(graceUntil).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

interface BillingGateProps {
  status: BillingStatus | null;
  children: React.ReactNode;
}

/**
 * Envuelve el panel de admin. Si el tenant superó el cupo gratis y no tiene
 * suscripción activa (ni exención), muestra un modal que bloquea TODO el panel
 * y lo manda a pagar a Mercado Pago.
 *
 * Multidispositivo: `status` viene del backend (misma fila para todos los
 * dispositivos), así que el bloqueo es consistente en todos lados.
 */
export function BillingGate({ status, children }: BillingGateProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const pathname = usePathname();

  // No bloqueamos las rutas de facturación (la página de éxito/retorno de MP
  // vive acá adentro y el webhook puede tardar en marcar el plan como activo).
  const onBillingRoute = pathname?.startsWith("/admin/billing") ?? false;
  const blocked = status?.requires_payment === true && !onBillingRoute;

  // Período de gracia: banner no bloqueante. Se puede cerrar pero vuelve en la
  // próxima carga (no guardamos el dismiss en server: es solo para esta vista).
  const showGraceBanner =
    status?.in_grace === true && !blocked && !onBillingRoute && !bannerDismissed;
  const remaining = daysLeft(status?.grace_until ?? null);

  async function handleSubscribe() {
    setLoading(true);
    setError(null);
    try {
      const { init_point } = await createSubscriptionAction();
      window.location.href = init_point;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo iniciar el pago. Probá de nuevo.",
      );
      setLoading(false);
    }
  }

  return (
    <>
      {children}

      {showGraceBanner && (
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed left-0 right-0 z-[150] px-[14px]"
          style={{ bottom: 78, maxWidth: 430, margin: "0 auto" }}
        >
          <div className="bg-ink-1 text-bg rounded-[16px] px-[16px] py-[14px] flex items-start gap-[12px] shadow-lg">
            <AlertTriangle size={20} className="flex-shrink-0 mt-[1px]" />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-medium leading-snug">
                {remaining > 0
                  ? `Te quedan ${remaining} día${remaining === 1 ? "" : "s"} para activar tu suscripción`
                  : "Tu período de gracia venció"}
              </p>
              <p className="text-[12px] opacity-75 leading-snug mt-[2px]">
                Después se bloquea el panel. Son $
                {(status?.amount ?? 20000).toLocaleString("es-AR")}/mes.
              </p>
              <button
                onClick={handleSubscribe}
                disabled={loading}
                className="mt-[10px] inline-flex items-center justify-center bg-accent text-white text-[13px] font-medium rounded px-[14px] h-[34px] disabled:opacity-50"
              >
                {loading ? "Abriendo…" : "Pagar ahora"}
              </button>
              {error && (
                <p className="text-[12px] text-danger mt-[8px]">{error}</p>
              )}
            </div>
            <button
              onClick={() => setBannerDismissed(true)}
              aria-label="Cerrar"
              className="flex-shrink-0 opacity-60 hover:opacity-100"
            >
              <X size={18} />
            </button>
          </div>
        </motion.div>
      )}

      {blocked && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-[24px]">
          {/* Overlay opaco: bloquea interacción con el panel detrás */}
          <div className="absolute inset-0 bg-ink-1/60 backdrop-blur-sm" />

          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="relative w-full bg-bg rounded-[22px] p-[26px] flex flex-col items-center text-center"
            style={{ maxWidth: 360 }}
            role="dialog"
            aria-modal="true"
          >
            <div className="w-[56px] h-[56px] rounded-full bg-line-2 flex items-center justify-center mb-[16px]">
              <Lock size={24} color="var(--ink-1)" />
            </div>

            <h2 className="font-serif text-[22px] leading-tight text-ink-1 mb-[8px]">
              Llegaste a {status?.free_client_limit ?? 30} clientes
            </h2>

            <p className="text-[14px] text-ink-2 leading-relaxed mb-[6px]">
              Tu plan gratis cubre los primeros{" "}
              {status?.free_client_limit ?? 30} clientes. Para seguir usando
              Turno1min y registrar más, activá la suscripción mensual.
            </p>

            <p className="font-serif text-[28px] text-ink-1 my-[14px]">
              ${(status?.amount ?? 20000).toLocaleString("es-AR")}
              <span className="text-[14px] text-ink-2 font-sans"> /mes</span>
            </p>

            <Btn variant="accent" loading={loading} onClick={handleSubscribe}>
              Suscribirme con Mercado Pago
            </Btn>

            {error && (
              <p className="text-[13px] text-danger mt-[12px]">{error}</p>
            )}

            <p className="text-[12px] text-ink-3 mt-[14px] leading-relaxed">
              Pago seguro vía Mercado Pago. Se debita automáticamente cada mes.
              Podés cancelar cuando quieras.
            </p>
          </motion.div>
        </div>
      )}
    </>
  );
}
