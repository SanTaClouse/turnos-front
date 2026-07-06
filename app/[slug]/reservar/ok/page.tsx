"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useBookingStore } from "@/store/booking";
import type { ConfirmedSnapshot } from "@/store/booking";
import type { BookingPaymentStatus } from "@/types/api";
import { Btn } from "@/components/ui/btn";
import { Icon } from "@/components/ui/icon";
import { BrandMark } from "@/components/ui/brand-mark";

function initialsFrom(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// ─── Helpers ───────────────────────────────────────────────
function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return `${days[date.getDay()]} ${d} de ${months[m - 1]}`;
}

function countdown(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const days = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  if (days < 7) return `En ${days} días`;
  if (days < 14) return "En una semana";
  return `En ${Math.floor(days / 7)} semanas`;
}

function addMinutes(time: string, mins: number) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function fmtMoney(n: number, currency?: string | null) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: currency || "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

// ─── Animated checkmark ────────────────────────────────────
function AnimatedCheck() {
  return (
    <div className="relative w-[96px] h-[96px]">
      <motion.div
        className="absolute inset-0 rounded-full bg-ink-1"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      />
      <svg width="96" height="96" viewBox="0 0 96 96" className="relative">
        {/* Circle ring */}
        <motion.circle
          cx="48" cy="48" r="45"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          style={{ rotate: -90, transformOrigin: "48px 48px" }}
        />
        {/* Checkmark */}
        <motion.path
          d="M28 50 L42 62 L68 34"
          fill="none"
          stroke="var(--bg)"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.55, ease: [0.65, 0, 0.35, 1] }}
        />
      </svg>
    </div>
  );
}

// ─── Calendar menu ─────────────────────────────────────────
function CalendarMenu({ date, time, endTime, title, onClose }: {
  date: string; time: string; endTime: string; title: string; onClose: () => void;
}) {
  const [y, m, d] = date.split("-").map(Number);
  const [startH, startM] = time.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);

  const dtStart = `${y}${String(m).padStart(2, "0")}${String(d).padStart(2, "0")}T${String(startH).padStart(2, "0")}${String(startM).padStart(2, "0")}00`;
  const dtEnd = `${y}${String(m).padStart(2, "0")}${String(d).padStart(2, "0")}T${String(endH).padStart(2, "0")}${String(endM).padStart(2, "0")}00`;

  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${dtStart}/${dtEnd}`;
  const icsContent = [
    "BEGIN:VCALENDAR", "VERSION:2.0",
    "BEGIN:VEVENT",
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${title}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\n");
  const icsUrl = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;

  const items = [
    { label: "Google Calendar", emoji: "🗓", href: googleUrl, target: "_blank" },
    { label: "Apple Calendar (.ics)", emoji: "🍎", href: icsUrl, download: "turno.ics" },
    { label: "Outlook (.ics)", emoji: "📨", href: icsUrl, download: "turno.ics" },
  ];

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-10" />
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute bottom-[calc(100%+6px)] left-0 right-0 bg-surface border border-line rounded overflow-hidden z-20"
        style={{ boxShadow: "0 20px 40px -10px rgba(0,0,0,0.15)" }}
      >
        {items.map((item, i) => (
          <a
            key={i}
            href={item.href}
            target={"target" in item ? item.target : undefined}
            download={"download" in item ? item.download : undefined}
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex items-center gap-[12px] px-[16px] py-[14px] text-[14px] text-ink-1 hover:bg-line-2 transition-colors"
            style={{ borderBottom: i < items.length - 1 ? "1px solid var(--line-2)" : "none" }}
          >
            <span className="text-[18px]">{item.emoji}</span>
            {item.label}
          </a>
        ))}
      </motion.div>
    </>
  );
}

// ─── Detail line ───────────────────────────────────────────
function DetailLine({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-baseline py-[6px] gap-[12px]">
      <span className="text-[12px] text-ink-3 whitespace-nowrap flex-shrink-0">{label}</span>
      <span
        className={`text-[13px] text-ink-1 font-medium text-right truncate ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Loading skeleton (durante hidratación) ────────────────
function TicketLoading() {
  return (
    <div className="min-h-screen bg-bg flex flex-col" style={{ maxWidth: 430, margin: "0 auto" }}>
      <div className="flex-1 overflow-y-auto hide-scroll px-[24px] pb-[20px]">
        {/* Check pulse */}
        <div className="flex justify-center mt-[40px]">
          <motion.div
            className="w-[96px] h-[96px] rounded-full bg-line-2"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        {/* Título placeholder */}
        <div className="mt-[28px] flex flex-col items-center gap-[10px]">
          <div className="h-[28px] w-[240px] rounded bg-line-2 animate-pulse" />
          <div className="h-[14px] w-[180px] rounded bg-line-2 animate-pulse mt-[10px]" />
        </div>
        {/* Ticket placeholder */}
        <div className="mt-[28px] bg-surface border border-line rounded-lg overflow-hidden">
          <div className="flex items-center gap-[12px] px-[18px] py-[16px] border-b border-dashed border-line">
            <div className="w-[36px] h-[36px] rounded-[8px] bg-line-2 animate-pulse" />
            <div className="flex-1 flex flex-col gap-[6px]">
              <div className="h-[14px] w-[120px] rounded bg-line-2 animate-pulse" />
              <div className="h-[10px] w-[80px] rounded bg-line-2 animate-pulse" />
            </div>
          </div>
          <div className="px-[18px] py-[24px] flex flex-col items-center gap-[10px]">
            <div className="h-[10px] w-[60px] rounded bg-line-2 animate-pulse" />
            <div className="h-[36px] w-[180px] rounded bg-line-2 animate-pulse" />
            <div className="h-[12px] w-[100px] rounded bg-line-2 animate-pulse" />
          </div>
          <div className="h-[1px] bg-line mx-[18px]" />
          <div className="px-[18px] py-[18px] flex flex-col gap-[10px]">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between">
                <div className="h-[10px] w-[60px] rounded bg-line-2 animate-pulse" />
                <div className="h-[10px] w-[100px] rounded bg-line-2 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────
// useSearchParams necesita un límite de Suspense para no romper el build.
export default function SuccessPage({ params }: { params: { slug: string } }) {
  return (
    <Suspense fallback={<TicketLoading />}>
      <SuccessContent params={params} />
    </Suspense>
  );
}

function SuccessContent({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const bp = useSearchParams().get("bp");
  const storeConfirmed = useBookingStore((s) => s.confirmed);
  const [calOpen, setCalOpen] = useState(false);

  // Zustand persist hidrata async desde localStorage. Antes de saber si hay
  // o no datos, mostramos un skeleton — no el fallback "No hay turno
  // confirmado", que es el flash que el usuario veía en producción.
  const [hydrated, setHydrated] = useState(() =>
    useBookingStore.persist.hasHydrated(),
  );
  useEffect(() => {
    if (hydrated) return;
    const unsub = useBookingStore.persist.onFinishHydration(() =>
      setHydrated(true),
    );
    return unsub;
  }, [hydrated]);

  // Fallback robusto: si no hay snapshot local pero llegamos con ?bp= (vuelta
  // del pago), reconstruimos el ticket desde el backend. Cubre el caso iOS
  // donde la app de Mercado Pago devuelve en OTRO contexto de navegador, sin
  // acceso al localStorage donde se guardó el `confirmed`.
  const [remote, setRemote] = useState<ConfirmedSnapshot | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(false);
  useEffect(() => {
    if (!hydrated || storeConfirmed || !bp) return;
    let alive = true;
    setRemoteLoading(true);
    api
      .get<BookingPaymentStatus>(`/payments/booking-status?bp=${bp}`)
      .then((data) => {
        if (!alive || !data.appointment) return;
        const a = data.appointment;
        const paid = data.status === "approved";
        setRemote({
          appointmentId: a.id,
          tenantName: a.tenant_name ?? "",
          tenantAddress: a.tenant_address,
          tenantInitials: initialsFrom(a.tenant_name ?? ""),
          tenantLogoUrl: a.tenant_logo_url,
          countryCode: "+54",
          confirmedAt: new Date().toISOString(),
          serviceId: null,
          serviceName: a.service_name,
          serviceDuration: a.service_duration,
          servicePrice: null,
          date: a.date,
          time: a.time,
          resourceId: null,
          resourceName: a.resource_name,
          clientName: a.client_name ?? "",
          clientPhone: "",
          clientEmail: a.client_email ?? "",
          notes: "",
          depositAmount: paid ? data.amount : null,
          depositKind: data.kind,
          depositCurrency: data.currency,
          paid,
        });
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setRemoteLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [hydrated, storeConfirmed, bp]);

  const confirmed = storeConfirmed ?? remote;

  // Una vez mostrado el ticket, limpiamos el flow del booking (step,
  // servicio, fecha, hora) para que si el usuario vuelve a /reservar
  // —vía "Reservar otro turno" o el botón back— arranque limpio.
  // Mantiene `confirmed` y datos del cliente intactos.
  useEffect(() => {
    if (!hydrated) return;
    useBookingStore.getState().resetFlow();
  }, [hydrated]);

  // Skeleton mientras hidrata o mientras traemos el turno del backend.
  if (!hydrated || (!confirmed && bp && remoteLoading)) return <TicketLoading />;

  // Si ya hidrató y no hay datos confirmados (ni local ni remoto), fallback.
  if (!confirmed) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-[20px] text-center gap-[16px]">
        <p className="text-[15px] text-ink-2">No hay turno confirmado.</p>
        <Btn variant="secondary" size="md" full={false} onClick={() => router.push(`/${params.slug}`)}>
          Volver al inicio
        </Btn>
      </div>
    );
  }

  const endTime = confirmed.time && confirmed.serviceDuration
    ? addMinutes(confirmed.time, confirmed.serviceDuration)
    : confirmed.time ?? "";

  const calTitle = `${confirmed.serviceName} en ${confirmed.tenantName}`;
  const shortCode = `TA-${confirmed.appointmentId.slice(0, 5).toUpperCase()}`;

  return (
    <div className="min-h-screen bg-bg flex flex-col" style={{ maxWidth: 430, margin: "0 auto" }}>
      <div className="flex-1 overflow-y-auto hide-scroll px-[24px] pb-[20px]">

        {/* Checkmark animado */}
        <div className="flex justify-center mt-[40px]">
          <AnimatedCheck />
        </div>

        {/* Título */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          className="text-center mt-[20px]"
        >
          <div className="font-serif text-[30px] leading-[1.15] text-balance" style={{ letterSpacing: "-0.5px" }}>
            ¡Tu turno está reservado!
          </div>
          <div className="text-[14px] text-ink-2 mt-[16px] leading-[1.5]">
            Te enviaremos la confirmación al <br />
            <span className="font-mono text-[13px] text-ink-1">{confirmed.clientEmail}</span>
          </div>
        </motion.div>

        {/* Ticket */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mt-[28px] bg-surface border border-line rounded-lg overflow-hidden"
        >
          {/* Header del ticket */}
          <div className="flex items-center gap-[12px] px-[18px] py-[16px] border-b border-dashed border-line">
            <BrandMark initials={confirmed.tenantInitials} imageUrl={confirmed.tenantLogoUrl} size={36} />
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold" style={{ letterSpacing: "-0.2px" }}>{confirmed.tenantName}</div>
              {confirmed.tenantAddress && (
                <div className="text-[11px] text-ink-3 mt-[1px] truncate">{confirmed.tenantAddress}</div>
              )}
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.3px] bg-accent text-white px-[10px] py-[4px] rounded-full">
              Reservado
            </span>
          </div>

          {/* Fecha grande */}
          <div className="px-[18px] py-[20px] text-center">
            <div className="label-mono" style={{ letterSpacing: "0.15em" }}>
              {confirmed.date ? countdown(confirmed.date) : ""}
            </div>
            <div className="font-serif text-[42px] leading-[1] mt-[8px]" style={{ letterSpacing: "-0.5px" }}>
              {confirmed.date ? formatDate(confirmed.date).split(" ").slice(1).join(" ") : ""}
            </div>
            <div className="text-[14px] text-ink-2 mt-[8px]">
              <span className="font-mono">{confirmed.time}</span>
              <span className="mx-[6px] text-ink-3">→</span>
              <span className="font-mono">{endTime}</span>
            </div>
          </div>

          {/* Divider */}
          <div className="h-[1px] bg-line mx-[18px]" />

          {/* Detalles */}
          <div className="px-[18px] py-[14px]">
            {confirmed.serviceName && <DetailLine label="Servicio" value={`${confirmed.serviceName} · ${confirmed.serviceDuration} min`} />}
            {confirmed.resourceName && <DetailLine label="Profesional" value={confirmed.resourceName} />}
            {confirmed.clientName && <DetailLine label="A nombre de" value={confirmed.clientName} />}
            <DetailLine label="Código" value={shortCode} mono />
          </div>

          {/* Seña / pago acreditado */}
          {confirmed.paid && confirmed.depositAmount != null && (
            <div className="mx-[18px] mb-[16px] flex items-center gap-[11px] px-[14px] py-[12px] rounded-[10px] bg-line-2">
              <div className="w-[28px] h-[28px] rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                <Icon name="check" size={15} color="#fff" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-ink-1" style={{ letterSpacing: "-0.2px" }}>
                  {confirmed.depositKind === "full" ? "Pago realizado" : "Seña pagada"}
                </div>
                <div className="text-[11px] text-ink-3 mt-[1px]">Confirmado con Mercado Pago</div>
              </div>
              <div className="font-mono text-[14px] font-semibold text-ink-1 flex-shrink-0">
                {fmtMoney(confirmed.depositAmount, confirmed.depositCurrency)}
              </div>
            </div>
          )}
        </motion.div>

        {/* Aviso screenshot */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.4 }}
          className="mt-[14px] flex items-center justify-center gap-[6px] text-[11px] text-ink-3"
        >
          <Icon name="image" size={12} color="var(--ink-3)" className="flex-shrink-0" />
          <span>
            Sacá una <span className="text-ink-2 font-medium">captura</span> para no perderlo
          </span>
        </motion.div>

        {/* Acciones */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.4 }}
          className="mt-[18px] flex flex-col gap-[10px]"
        >
          <div className="relative">
            <Btn variant="secondary" size="lg" full onClick={() => setCalOpen((o) => !o)} className="gap-2">
              <Icon name="calendar" size={16} color="var(--ink-2)" />
              Agregar al calendario
              <Icon name="chevronDown" size={14} color="var(--ink-2)" className="ml-auto" />
            </Btn>
            {calOpen && confirmed.date && confirmed.time && (
              <CalendarMenu
                date={confirmed.date}
                time={confirmed.time}
                endTime={endTime}
                title={calTitle}
                onClose={() => setCalOpen(false)}
              />
            )}
          </div>

          <Btn variant="ghost" size="lg" full onClick={() => router.push(`/${params.slug}/reservar`)}>
            Reservar otro turno
          </Btn>
        </motion.div>

        {/* Footer gestionar */}
        <div className="mt-[20px] flex items-center gap-[10px] px-[16px] py-[14px] bg-line-2 rounded-[12px]">
          <p className="flex-1 text-[12px] text-ink-2 leading-[1.5]">¿Necesitás cambiar algo?</p>
          <button
            onClick={() => router.push(`/${params.slug}/mi-turno`)}
            className="press-fx flex items-center gap-1 text-[13px] font-medium text-ink-1"
            style={{ background: "transparent", border: 0, fontFamily: "inherit", cursor: "pointer" }}
          >
            Gestionar turno <Icon name="forward" size={12} color="var(--ink-1)" />
          </button>
        </div>

        <div className="h-[20px]" />
      </div>
    </div>
  );
}
