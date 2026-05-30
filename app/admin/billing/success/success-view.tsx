"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Btn } from "@/components/ui/btn";
import { getBillingStatusAction } from "@/app/actions";

type Phase = "checking" | "active" | "pending";

/**
 * Pantalla de agradecimiento tras volver de Mercado Pago.
 *
 * El cobro lo confirma MP por webhook, que puede tardar unos segundos. Hacemos
 * polling al estado hasta verlo "active"; mientras tanto mostramos igual el
 * agradecimiento (el dueño ya autorizó el pago en MP).
 */
export function BillingSuccessView() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("checking");

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    async function poll() {
      attempts += 1;
      try {
        const status = await getBillingStatusAction();
        if (cancelled) return;
        if (status && status.plan_status === "active") {
          setPhase("active");
          return; // listo, dejamos de pollear
        }
      } catch {
        /* reintentamos */
      }
      // Hasta ~30s (10 intentos x 3s). Después asumimos que el webhook llegará.
      if (attempts >= 10) {
        if (!cancelled) setPhase("pending");
        return;
      }
      setTimeout(poll, 3000);
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-[28px]">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 20 }}
        className="w-[72px] h-[72px] rounded-full bg-accent/15 flex items-center justify-center mb-[20px]"
      >
        <CheckCircle2 size={40} color="var(--accent)" />
      </motion.div>

      <h1 className="font-serif text-[26px] leading-tight text-ink-1 mb-[10px]">
        ¡Gracias por suscribirte!
      </h1>

      <p className="text-[15px] text-ink-2 leading-relaxed max-w-[300px] mb-[8px]">
        Tu suscripción a Turno1min quedó registrada. Ya podés seguir sumando
        clientes sin límites.
      </p>

      {phase === "checking" && (
        <p className="flex items-center gap-2 text-[13px] text-ink-3 mt-[8px]">
          <Loader2 size={14} className="animate-spin" />
          Confirmando el pago con Mercado Pago…
        </p>
      )}
      {phase === "pending" && (
        <p className="text-[13px] text-ink-3 mt-[8px] max-w-[300px]">
          Estamos terminando de confirmar el pago. Puede tardar un minuto; si el
          aviso vuelve a aparecer, refrescá la página.
        </p>
      )}
      {phase === "active" && (
        <p className="text-[13px] text-accent mt-[8px]">
          Suscripción activa ✓
        </p>
      )}

      <div className="w-full max-w-[300px] mt-[28px]">
        <Btn variant="primary" onClick={() => router.push("/admin/agenda")}>
          Volver al panel
        </Btn>
      </div>
    </div>
  );
}
