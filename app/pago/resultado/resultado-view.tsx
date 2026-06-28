"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useBookingStore } from "@/store/booking";
import type { BookingPaymentStatus } from "@/types/api";
import { Btn } from "@/components/ui/btn";
import { Icon } from "@/components/ui/icon";

type View = "checking" | "approved" | "pending" | "rejected" | "error";

const MAX_TRIES = 15;
const INTERVAL_MS = 1800;

export function ResultadoView({ bp, slug }: { bp: string; slug: string }) {
  const router = useRouter();
  const setPaymentResult = useBookingStore((s) => s.setPaymentResult);
  const [view, setView] = useState<View>(bp ? "checking" : "error");
  const triesRef = useRef(0);

  useEffect(() => {
    if (!bp) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const data = await api.get<BookingPaymentStatus>(
          `/payments/booking-status?bp=${bp}`,
        );
        if (cancelled) return;

        if (data.status === "approved") {
          setPaymentResult({
            depositAmount: data.amount,
            depositKind: data.kind,
            currency: data.currency,
            paid: true,
          });
          setView("approved");
          // Pequeña pausa para que se vea el check antes de ir al ticket.
          setTimeout(() => {
            if (!cancelled && slug) router.replace(`/${slug}/reservar/ok`);
          }, 1600);
          return;
        }
        if (["rejected", "cancelled", "refunded"].includes(data.status)) {
          setView("rejected");
          return;
        }
        // pending / in_process → MP todavía no acreditó: reintentamos.
        triesRef.current += 1;
        if (triesRef.current >= MAX_TRIES) {
          setView("pending");
          return;
        }
        timer = setTimeout(poll, INTERVAL_MS);
      } catch {
        if (cancelled) return;
        triesRef.current += 1;
        if (triesRef.current >= MAX_TRIES) {
          setView("error");
          return;
        }
        timer = setTimeout(poll, INTERVAL_MS);
      }
    };

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [bp, slug, router, setPaymentResult]);

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-[28px] text-center" style={{ maxWidth: 430, margin: "0 auto" }}>
      {view === "checking" && (
        <>
          <Spinner />
          <Title>Confirmando tu pago…</Title>
          <Sub>Estamos verificando con Mercado Pago. Tardamos unos segundos.</Sub>
        </>
      )}

      {view === "approved" && (
        <>
          <AnimatedCheck />
          <Title>¡Pago confirmado!</Title>
          <Sub>Tu turno quedó asegurado. Te llevamos al detalle…</Sub>
        </>
      )}

      {view === "pending" && (
        <>
          <StatusBadge tone="warn" icon="clock" />
          <Title>Tu pago está en revisión</Title>
          <Sub>
            Mercado Pago todavía no lo acreditó. Apenas se confirme, tu turno
            queda asegurado. Podés ver el detalle igual.
          </Sub>
          <Actions>
            {slug && (
              <Btn size="lg" full onClick={() => router.replace(`/${slug}/reservar/ok`)}>
                Ver mi turno
              </Btn>
            )}
          </Actions>
        </>
      )}

      {view === "rejected" && (
        <>
          <StatusBadge tone="danger" icon="close" />
          <Title>El pago no se concretó</Title>
          <Sub>No se realizó ningún cobro. Podés intentar de nuevo.</Sub>
          <Actions>
            {slug && (
              <>
                <Btn size="lg" full onClick={() => router.replace(`/${slug}/reservar/pago`)}>
                  Reintentar el pago
                </Btn>
                <Btn variant="ghost" size="lg" full onClick={() => router.replace(`/${slug}/reservar/ok`)}>
                  Ver mi turno sin pagar
                </Btn>
              </>
            )}
          </Actions>
        </>
      )}

      {view === "error" && (
        <>
          <StatusBadge tone="warn" icon="alert" />
          <Title>No pudimos verificar el pago</Title>
          <Sub>Puede ser un problema de conexión. Revisá tu turno o intentá de nuevo.</Sub>
          <Actions>
            {slug ? (
              <>
                <Btn size="lg" full onClick={() => router.replace(`/${slug}/reservar/ok`)}>
                  Ver mi turno
                </Btn>
                <Btn variant="ghost" size="lg" full onClick={() => router.replace(`/${slug}/reservar/pago`)}>
                  Reintentar el pago
                </Btn>
              </>
            ) : (
              <Btn variant="secondary" size="lg" full onClick={() => router.replace(`/`)}>
                Volver al inicio
              </Btn>
            )}
          </Actions>
        </>
      )}
    </div>
  );
}

// ─── UI bits ───────────────────────────────────────────────
function Title({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="font-serif text-[28px] leading-[1.15] mt-[24px] text-balance"
      style={{ letterSpacing: "-0.5px" }}
    >
      {children}
    </motion.div>
  );
}

function Sub({ children }: { children: React.ReactNode }) {
  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="text-[14px] text-ink-2 mt-[12px] leading-[1.5]"
      style={{ maxWidth: 320 }}
    >
      {children}
    </motion.p>
  );
}

function Actions({ children }: { children: React.ReactNode }) {
  return <div className="w-full mt-[26px] flex flex-col gap-[10px]">{children}</div>;
}

function Spinner() {
  return (
    <motion.span
      className="w-[56px] h-[56px] rounded-full border-[3px] border-line border-t-ink-1"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
    />
  );
}

function StatusBadge({ tone, icon }: { tone: "warn" | "danger"; icon: Parameters<typeof Icon>[0]["name"] }) {
  const color = tone === "danger" ? "var(--danger)" : "#b8860b";
  const bg = tone === "danger" ? "rgba(196,90,60,0.10)" : "rgba(184,134,11,0.12)";
  return (
    <motion.div
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className="w-[72px] h-[72px] rounded-full flex items-center justify-center"
      style={{ background: bg }}
    >
      <Icon name={icon} size={30} color={color} />
    </motion.div>
  );
}

function AnimatedCheck() {
  return (
    <div className="relative w-[88px] h-[88px]">
      <motion.div
        className="absolute inset-0 rounded-full bg-ink-1"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      />
      <svg width="88" height="88" viewBox="0 0 96 96" className="relative">
        <motion.circle
          cx="48" cy="48" r="45"
          fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
          style={{ rotate: -90, transformOrigin: "48px 48px" }}
        />
        <motion.path
          d="M28 50 L42 62 L68 34"
          fill="none" stroke="var(--bg)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.45, delay: 0.45, ease: [0.65, 0, 0.35, 1] }}
        />
      </svg>
    </div>
  );
}
