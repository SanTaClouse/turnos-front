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

type OptionKey = "deposit" | "full" | "pay_later";

interface PayOption {
  key: OptionKey;
  label: string;
  sub: string;
  amount: number | null; // null = sin pago online
}

// ─── Helpers ───────────────────────────────────────────────
function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${days[date.getDay()]} ${d} ${months[m - 1]}`;
}

function computeDeposit(type: Tenant["deposit_type"], value: number, price: number): number {
  if (type === "fixed") return price > 0 ? Math.min(value, price) : value;
  return Math.round(((price * value) / 100) * 100) / 100; // percent
}

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
        <div className="mt-[28px] flex flex-col gap-[10px]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[64px] rounded-[12px] bg-line-2 animate-pulse" />
          ))}
        </div>
        <div className="mt-[16px] h-[54px] rounded-[14px] bg-line-2 animate-pulse" />
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────
export function PagoView({ slug, tenant }: { slug: string; tenant: Tenant }) {
  const router = useRouter();
  const confirmed = useBookingStore((s) => s.confirmed);
  const [selected, setSelected] = useState<OptionKey | null>(null);
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

  const price = confirmed.servicePrice ?? 0;
  const value = Number(tenant.deposit_value ?? 0);

  const fmt = (n: number) =>
    new Intl.NumberFormat(tenant.locale || "es-AR", {
      style: "currency",
      currency: tenant.currency || "ARS",
      maximumFractionDigits: 0,
    }).format(n);

  // Armamos las opciones habilitadas por el tenant.
  const options: PayOption[] = [];
  if (tenant.allow_deposit) {
    const amount = computeDeposit(tenant.deposit_type, value, price);
    if (amount > 0) {
      options.push({
        key: "deposit",
        label: "Seña",
        sub:
          tenant.deposit_type === "percent"
            ? `${value}% del total · se descuenta`
            : "Para reservar · se descuenta",
        amount,
      });
    }
  }
  if (tenant.allow_full && price > 0) {
    options.push({ key: "full", label: "Pago completo", sub: "Pagás todo ahora", amount: price });
  }
  if (tenant.allow_pay_later) {
    options.push({ key: "pay_later", label: "Pagar en el local", sub: "Reservás y pagás al ir", amount: null });
  }

  // Sin opciones cobrables: el turno ya quedó reservado.
  if (options.length === 0) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-[20px] text-center gap-[16px]">
        <p className="text-[15px] text-ink-2">Tu turno ya quedó reservado.</p>
        <Btn size="md" full={false} onClick={() => router.push(`/${slug}/reservar/ok`)}>
          Ver mi turno
        </Btn>
      </div>
    );
  }

  const current = options.find((o) => o.key === selected) ?? options[0];
  const isPaid = current.key === "deposit" || current.key === "full";
  const single = options.length === 1;

  const handleContinue = async () => {
    if (current.key === "pay_later") {
      router.push(`/${slug}/reservar/ok`);
      return;
    }
    setPaying(true);
    setError(null);
    try {
      const res = await api.post<{ init_point: string }>("/payments/checkout", {
        appointment_id: confirmed.appointmentId,
        option: current.key,
        payer_email: confirmed.clientEmail?.trim() || undefined,
      });
      window.location.href = res.init_point; // salimos al checkout de MP
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar el pago. Probá de nuevo.");
      setPaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col" style={{ maxWidth: 430, margin: "0 auto" }}>
      <div className="flex-1 overflow-y-auto hide-scroll px-[24px] pt-[28px] pb-[24px]">
        {/* Marca + título */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center">
          <BrandMark initials={confirmed.tenantInitials} size={56} />
          <div className="font-serif text-[26px] leading-[1.15] text-center mt-[18px] text-balance" style={{ letterSpacing: "-0.5px" }}>
            {single ? "Reservá tu lugar" : "¿Cómo querés reservar?"}
          </div>
          {confirmed.date && (
            <p className="text-[13px] text-ink-2 mt-[8px] text-center">
              {confirmed.serviceName} · {formatDate(confirmed.date)} · {confirmed.time}
            </p>
          )}
        </motion.div>

        {/* Tarjetas de opciones */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="mt-[24px] flex flex-col gap-[10px]"
        >
          {options.map((opt) => {
            const active = current.key === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setSelected(opt.key)}
                className="press-fx flex items-center gap-[14px] px-[16px] py-[15px] rounded-[14px] border text-left"
                style={{
                  borderColor: active ? "var(--ink-1)" : "var(--line)",
                  background: active ? "var(--line-2)" : "var(--surface)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold text-ink-1" style={{ letterSpacing: "-0.2px" }}>
                    {opt.label}
                  </div>
                  <div className="text-[12px] text-ink-3 mt-[2px]">{opt.sub}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-mono text-[15px] font-semibold text-ink-1">
                    {opt.amount != null ? fmt(opt.amount) : "—"}
                  </div>
                </div>
                <div
                  className="w-[20px] h-[20px] rounded-full border flex items-center justify-center flex-shrink-0"
                  style={{ borderColor: active ? "var(--ink-1)" : "var(--line)" }}
                >
                  {active && <div className="w-[10px] h-[10px] rounded-full bg-ink-1" />}
                </div>
              </button>
            );
          })}
        </motion.div>

        {error && <p className="text-[13px] text-danger mt-[14px] text-center">{error}</p>}

        {/* CTA */}
        <div className="mt-[20px]">
          {isPaid ? (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              onClick={handleContinue}
              disabled={paying}
              className="press-fx w-full h-[54px] rounded-[14px] flex items-center justify-center gap-[10px] text-white font-semibold text-[15px] disabled:opacity-70"
              style={{ background: MP_CYAN, border: 0, cursor: paying ? "wait" : "pointer", fontFamily: "inherit" }}
            >
              {paying ? (
                <Spinner />
              ) : (
                <>
                  <MpGlyph />
                  Pagar {fmt(current.amount as number)} con Mercado Pago
                </>
              )}
            </motion.button>
          ) : (
            <Btn onClick={handleContinue} size="lg" full>
              Confirmar reserva
            </Btn>
          )}
        </div>

        {isPaid && (
          <div className="mt-[12px] flex items-center justify-center gap-[6px] text-[11px] text-ink-3">
            <Icon name="lock" size={12} color="var(--ink-3)" />
            <span>Pago protegido y procesado por Mercado Pago</span>
          </div>
        )}
      </div>
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

function MpGlyph() {
  return (
    <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full bg-white" style={{ flexShrink: 0 }}>
      <span style={{ fontSize: 13 }}>🤝</span>
    </span>
  );
}
