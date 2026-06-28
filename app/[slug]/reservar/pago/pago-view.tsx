"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useBookingStore } from "@/store/booking";
import type { Tenant } from "@/types/api";
import { Btn } from "@/components/ui/btn";
import { Icon } from "@/components/ui/icon";
import { BrandMark } from "@/components/ui/brand-mark";

const MP_CYAN = "#009ee3";

// ─── Helpers ───────────────────────────────────────────────
function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${days[date.getDay()]} ${d} ${months[m - 1]}`;
}

function computeDeposit(
  mode: Tenant["deposit_mode"],
  value: number,
  price: number,
): number {
  switch (mode) {
    case "full":
      return price;
    case "percent":
      return Math.round(((price * value) / 100) * 100) / 100;
    case "fixed":
      return price > 0 ? Math.min(value, price) : value;
    default:
      return 0;
  }
}

// ─── Page skeleton mientras hidrata el store ───────────────
function PagoSkeleton() {
  return (
    <div className="min-h-screen bg-bg flex flex-col" style={{ maxWidth: 430, margin: "0 auto" }}>
      <div className="flex-1 px-[24px] pt-[40px]">
        <div className="flex justify-center">
          <div className="w-[60px] h-[60px] rounded-[16px] bg-line-2 animate-pulse" />
        </div>
        <div className="mt-[28px] flex flex-col items-center gap-[10px]">
          <div className="h-[24px] w-[220px] rounded bg-line-2 animate-pulse" />
          <div className="h-[14px] w-[160px] rounded bg-line-2 animate-pulse" />
        </div>
        <div className="mt-[32px] h-[160px] rounded-lg bg-line-2 animate-pulse" />
        <div className="mt-[16px] h-[52px] rounded-sm bg-line-2 animate-pulse" />
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────
export function PagoView({ slug, tenant }: { slug: string; tenant: Tenant }) {
  const router = useRouter();
  const confirmed = useBookingStore((s) => s.confirmed);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [hydrated, setHydrated] = useState(() =>
    useBookingStore.persist.hasHydrated(),
  );
  useEffect(() => {
    if (hydrated) return;
    return useBookingStore.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);

  if (!hydrated) return <PagoSkeleton />;

  // Sin reserva en el store: alguien entró directo. Mandamos a reservar.
  if (!confirmed) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-[20px] text-center gap-[16px]">
        <p className="text-[15px] text-ink-2">No hay una reserva para pagar.</p>
        <Btn variant="secondary" size="md" full={false} onClick={() => router.push(`/${slug}/reservar`)}>
          Reservar un turno
        </Btn>
      </div>
    );
  }

  const mode = tenant.deposit_mode ?? "none";
  const value = Number(tenant.deposit_value ?? 0);
  const price = confirmed.servicePrice ?? 0;
  const amount = computeDeposit(mode, value, price);
  const required = !!tenant.deposit_required;
  const isFull = mode === "full";

  const fmt = (n: number) =>
    new Intl.NumberFormat(tenant.locale || "es-AR", {
      style: "currency",
      currency: tenant.currency || "ARS",
      maximumFractionDigits: 0,
    }).format(n);

  // Si no hay monto a cobrar (ej: servicio sin precio), saltamos al ticket.
  if (!(amount > 0)) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-[20px] text-center gap-[16px]">
        <p className="text-[15px] text-ink-2">Tu turno ya quedó reservado.</p>
        <Btn size="md" full={false} onClick={() => router.push(`/${slug}/reservar/ok`)}>
          Ver mi turno
        </Btn>
      </div>
    );
  }

  const handlePay = async () => {
    setPaying(true);
    setError(null);
    try {
      const res = await api.post<{ init_point: string }>("/payments/checkout", {
        appointment_id: confirmed.appointmentId,
        payer_email: confirmed.clientEmail?.trim() || undefined,
      });
      // Salimos del SPA hacia el checkout de Mercado Pago.
      window.location.href = res.init_point;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar el pago. Probá de nuevo.");
      setPaying(false);
    }
  };

  const subtitle = isFull
    ? "Pago total del servicio"
    : mode === "percent"
      ? `Seña del ${value}% · se descuenta del total`
      : "Seña · se descuenta del total";

  return (
    <div className="min-h-screen bg-bg flex flex-col" style={{ maxWidth: 430, margin: "0 auto" }}>
      <div className="flex-1 overflow-y-auto hide-scroll px-[24px] pt-[28px] pb-[24px]">
        {/* Marca */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center"
        >
          <BrandMark initials={confirmed.tenantInitials} size={56} />
          <div className="font-serif text-[26px] leading-[1.15] text-center mt-[18px] text-balance" style={{ letterSpacing: "-0.5px" }}>
            {required ? "Confirmá con una seña" : "Asegurá tu lugar"}
          </div>
          <p className="text-[13px] text-ink-2 mt-[8px] text-center leading-[1.5]" style={{ maxWidth: 300 }}>
            {required
              ? "Tu turno queda confirmado una vez recibido el pago."
              : "Dejá una seña ahora o pagá en el local cuando vayas."}
          </p>
        </motion.div>

        {/* Tarjeta de monto */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="mt-[26px] bg-surface border border-line rounded-lg overflow-hidden"
        >
          <div className="px-[20px] py-[24px] text-center">
            <div className="label-mono" style={{ letterSpacing: "0.15em" }}>
              {isFull ? "A pagar" : "Seña a pagar"}
            </div>
            <div className="font-serif text-[46px] leading-[1] mt-[8px]" style={{ letterSpacing: "-1px" }}>
              {fmt(amount)}
            </div>
            <div className="text-[12px] text-ink-3 mt-[8px]">{subtitle}</div>
          </div>

          <div className="h-[1px] bg-line mx-[20px]" />

          {/* Mini-resumen del turno */}
          <div className="px-[20px] py-[16px] flex flex-col gap-[8px]">
            <Row label="Servicio" value={confirmed.serviceName ?? "—"} />
            {confirmed.date && (
              <Row
                label="Cuándo"
                value={`${formatDate(confirmed.date)} · ${confirmed.time}`}
              />
            )}
            {!isFull && price > 0 && (
              <Row label="Total del servicio" value={fmt(price)} muted />
            )}
          </div>
        </motion.div>

        {error && (
          <p className="text-[13px] text-danger mt-[14px] text-center">{error}</p>
        )}

        {/* CTA Mercado Pago */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          onClick={handlePay}
          disabled={paying}
          className="press-fx w-full h-[54px] mt-[20px] rounded-[14px] flex items-center justify-center gap-[10px] text-white font-semibold text-[15px] disabled:opacity-70"
          style={{ background: MP_CYAN, border: 0, cursor: paying ? "wait" : "pointer", fontFamily: "inherit" }}
        >
          {paying ? (
            <Spinner />
          ) : (
            <>
              <MpGlyph />
              Pagar con Mercado Pago
            </>
          )}
        </motion.button>

        {/* Pago seguro */}
        <div className="mt-[12px] flex items-center justify-center gap-[6px] text-[11px] text-ink-3">
          <Icon name="lock" size={12} color="var(--ink-3)" />
          <span>Pago protegido y procesado por Mercado Pago</span>
        </div>

        {/* Opción de pagar en el local (solo si la seña es opcional) */}
        {!required && (
          <button
            onClick={() => router.push(`/${slug}/reservar/ok`)}
            disabled={paying}
            className="press-fx w-full mt-[18px] text-[13px] text-ink-2 underline underline-offset-4 disabled:opacity-50"
            style={{ background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit" }}
          >
            Prefiero pagar en el local
          </button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between items-baseline gap-[12px]">
      <span className="text-[12px] text-ink-3 whitespace-nowrap flex-shrink-0">{label}</span>
      <span className={`text-[13px] font-medium text-right truncate ${muted ? "text-ink-3" : "text-ink-1"}`}>
        {value}
      </span>
    </div>
  );
}

function Spinner() {
  return (
    <motion.span
      className="w-[18px] h-[18px] rounded-full border-2 border-white/40 border-t-white"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
    />
  );
}

// Glifo simple del handshake de Mercado Pago (sin depender de un asset).
function MpGlyph() {
  return (
    <span
      className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full bg-white"
      style={{ flexShrink: 0 }}
    >
      <span style={{ fontSize: 13 }}>🤝</span>
    </span>
  );
}
