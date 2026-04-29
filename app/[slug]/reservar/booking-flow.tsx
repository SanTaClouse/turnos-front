"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { Tenant, Service, Resource, AvailableSlot } from "@/types/api";
import { useBookingStore } from "@/store/booking";
import { BrandMark } from "@/components/ui/brand-mark";
import { Icon } from "@/components/ui/icon";
import { Btn } from "@/components/ui/btn";
import { api } from "@/lib/api";

// ─── Animation helpers ─────────────────────────────────────
const bubbleSpring = { type: "spring", stiffness: 380, damping: 30 } as const;

function Bubble({ children, delay = 0, style, className }: {
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...bubbleSpring, delay: delay / 1000 }}
      style={style}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Helpers ───────────────────────────────────────────────
function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return `${days[date.getDay()]} ${d} de ${months[m - 1]}`;
}

function formatDateShort(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  return { dow: days[date.getDay()], day: d };
}

function addMinutes(time: string, mins: number) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function generateDates(days = 30): string[] {
  const result: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    result.push(d.toISOString().slice(0, 10));
  }
  return result;
}

// ─── Bubble sub-components ─────────────────────────────────
function AssistantMsg({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <Bubble
      delay={delay}
      className="bg-surface border border-line rounded-[16px_16px_16px_4px] px-[14px] py-[12px] text-[15px] leading-[1.4] mt-[12px]"
      style={{ maxWidth: "85%", letterSpacing: "-0.2px" }}
    >
      {children}
    </Bubble>
  );
}

function UserMsg({ children }: { children: React.ReactNode }) {
  return (
    <Bubble
      className="bg-ink-1 text-bg rounded-[16px_16px_4px_16px] px-[14px] py-[10px] text-[14px] font-medium mt-[10px]"
      style={{ maxWidth: "85%", marginLeft: "auto", letterSpacing: "-0.2px" }}
    >
      {children}
    </Bubble>
  );
}

function TypingBubble() {
  return (
    <Bubble className="w-[58px] bg-surface border border-line rounded-[16px_16px_16px_4px] px-[14px] py-[12px] mt-[12px] flex gap-1 items-center">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[6px] h-[6px] rounded-full bg-ink-3 animate-pulse"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </Bubble>
  );
}

// ─── Step: Servicios ───────────────────────────────────────
function StepServices({ services, locale, currency, onPick }: {
  services: Service[];
  locale: string;
  currency: string;
  onPick: (svc: Service) => void;
}) {
  const fmt = (p: number | null) =>
    p == null ? null : new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(p);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 380, damping: 30, delay: 0.3 }}
      className="mt-[14px] flex flex-col gap-[8px]">
      {services.map((svc) => (
        <button
          key={svc.id}
          onClick={() => onPick(svc)}
          className="press-fx bg-surface border border-line rounded text-left flex items-center gap-[12px] px-[16px] py-[14px] w-full"
          style={{ fontFamily: "inherit" }}
        >
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-medium text-ink-1" style={{ letterSpacing: "-0.2px" }}>{svc.name}</div>
            <div className="font-mono text-[12px] text-ink-3 mt-[3px]">
              {svc.duration_minutes} min{svc.description ? ` · ${svc.description}` : ""}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {fmt(svc.price) && (
              <div className="font-mono text-[13px] text-ink-1 font-medium">{fmt(svc.price)}</div>
            )}
            <Icon name="forward" size={14} color="var(--ink-3)" />
          </div>
        </button>
      ))}
    </motion.div>
  );
}

// ─── Step: Fecha ───────────────────────────────────────────
function StepDate({ tenantId, serviceId, onPick }: {
  tenantId: string;
  serviceId: string;
  onPick: (date: string) => void;
}) {
  const dates = generateDates(30);
  const [offset, setOffset] = useState(0);
  const todayStr = dates[0];
  const visible = dates.slice(offset * 14, offset * 14 + 14);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 380, damping: 30, delay: 0.3 }}
      className="mt-[14px]">
      <div className="flex gap-[8px] overflow-x-auto pb-[4px] hide-scroll">
        {visible.map((dateStr) => {
          const { dow, day } = formatDateShort(dateStr);
          const isToday = dateStr === todayStr;
          const isPast = dateStr < todayStr;
          return (
            <button
              key={dateStr}
              onClick={() => !isPast && onPick(dateStr)}
              disabled={isPast}
              className="press-fx flex-shrink-0 flex flex-col items-center gap-1 py-[10px] bg-surface border border-line rounded-[12px] w-[58px]"
              style={{ fontFamily: "inherit", opacity: isPast ? 0.35 : 1 }}
            >
              <span className="font-mono text-[10px] text-ink-3 uppercase tracking-[0.05em]">{dow}</span>
              <span className="text-[20px] font-medium text-ink-1" style={{ letterSpacing: "-0.5px" }}>{day}</span>
              <span className="w-[4px] h-[4px] rounded-full" style={{ background: isToday ? "var(--accent)" : "var(--line)" }} />
            </button>
          );
        })}
      </div>
      <div className="flex gap-[8px] mt-[12px] items-center">
        <button
          onClick={() => setOffset((o) => Math.max(0, o - 1))}
          disabled={offset === 0}
          className="press-fx w-[36px] h-[36px] flex items-center justify-center bg-surface border border-line rounded-[10px]"
          style={{ opacity: offset === 0 ? 0.4 : 1 }}
        >
          <Icon name="back" size={14} color="var(--ink-2)" />
        </button>
        <button
          onClick={() => setOffset((o) => o + 1)}
          disabled={(offset + 1) * 14 >= dates.length}
          className="press-fx w-[36px] h-[36px] flex items-center justify-center bg-surface border border-line rounded-[10px]"
        >
          <Icon name="forward" size={14} color="var(--ink-2)" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Step: Hora ────────────────────────────────────────────
function StepTime({ tenantId, serviceId, date, resources, onPick }: {
  tenantId: string;
  serviceId: string;
  date: string;
  resources: Resource[];
  onPick: (time: string, resourceId: string, resourceName: string) => void;
}) {
  const [slots, setSlots] = useState<AvailableSlot[] | null>(null);

  useEffect(() => {
    setSlots(null);
    api.get<AvailableSlot[]>(
      `/availability/slots?tenantId=${tenantId}&serviceId=${serviceId}&date=${date}`
    )
      .then(setSlots)
      .catch(() => setSlots([]));
  }, [tenantId, serviceId, date]);

  if (slots === null) return <TimeSkeleton />;
  if (slots.length === 0) return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className="mt-[14px] text-center px-[20px] py-[28px] bg-surface border border-dashed border-line rounded text-ink-2 text-[14px]">
      No hay turnos disponibles este día. Probá con otra fecha.
    </motion.div>
  );

  const groups: Record<string, AvailableSlot[]> = { manana: [], tarde: [], noche: [] };
  slots.forEach((s) => {
    const h = parseInt(s.slot.split(":")[0]);
    if (h < 12) groups.manana.push(s);
    else if (h < 18) groups.tarde.push(s);
    else groups.noche.push(s);
  });
  const labels: Record<string, string> = { manana: "Mañana", tarde: "Tarde", noche: "Noche" };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 380, damping: 30, delay: 0.2 }}
      className="mt-[14px] flex flex-col gap-[14px]">
      {Object.entries(groups).map(([key, arr]) =>
        arr.length === 0 ? null : (
          <div key={key}>
            <div className="label-mono mb-[8px]">{labels[key]} · {arr.length}</div>
            <div className="grid grid-cols-3 gap-[6px]">
              {arr.map((slot) => {
                const resource = resources.find((r) => r.id === slot.resource_ids[0]);
                return (
                  <button
                    key={slot.slot}
                    onClick={() => onPick(slot.slot, slot.resource_ids[0], resource?.name ?? "")}
                    className="press-fx bg-surface border border-line rounded-[10px] py-[10px] px-[6px] flex flex-col items-center gap-[3px]"
                    style={{ fontFamily: "inherit" }}
                  >
                    <span className="text-[14px] font-medium text-ink-1" style={{ letterSpacing: "-0.2px" }}>{slot.slot}</span>
                    {resource && <span className="text-[10px] text-ink-3">con {resource.name}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )
      )}
    </motion.div>
  );
}

function TimeSkeleton() {
  return (
    <div className="mt-[14px] flex flex-col gap-[14px]">
      {[0, 1].map((g) => (
        <div key={g}>
          <div className="h-[10px] w-[80px] rounded bg-line-2 animate-pulse mb-[8px]" />
          <div className="grid grid-cols-3 gap-[6px]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[52px] rounded-[10px] bg-line-2 animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Step: Datos del cliente ───────────────────────────────
function StepDetails({ initial, onContinue, countryCode = "+54" }: {
  initial: { name: string; phone: string; email: string; notes: string };
  onContinue: (name: string, phone: string, email: string, notes: string, country: string) => void;
  countryCode?: string;
}) {
  const [phone, setPhone] = useState(initial.phone);
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [notes, setNotes] = useState(initial.notes);
  const [country, setCountry] = useState(countryCode);

  const emailValid = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const ok = phone.length >= 8 && name.length >= 2 && emailValid;

  const inputClass = "w-full h-[48px] border border-line bg-surface rounded-sm px-[14px] text-[15px] text-ink-1 outline-none focus-visible:outline-[2px] focus-visible:outline-accent";

  const countryEmojis: Record<string, string> = { "+54": "🇦🇷", "+52": "🇲🇽", "+55": "🇧🇷", "+1": "🇺🇸", "+56": "🇨🇱", "+57": "🇨🇴", "+58": "🇻🇪", "+34": "🇪🇸" };
  const emoji = countryEmojis[country] || "🌐";
  const countryOptions = ["+54", "+52", "+55", "+1", "+56", "+57", "+58", "+34"];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 380, damping: 30, delay: 0.2 }}
      className="mt-[14px] flex flex-col gap-[10px]">
      {/* Teléfono */}
      <div>
        <div className="flex justify-between items-baseline mb-[6px]">
          <label className="text-[12px] font-medium text-ink-2">Teléfono</label>
        </div>
        <div className="flex gap-[6px]">
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="h-[48px] border border-line bg-surface rounded-sm px-[10px] text-[14px] font-medium text-ink-1 outline-none focus-visible:outline-[2px] focus-visible:outline-accent flex-shrink-0"
            style={{ fontFamily: "inherit" }}
          >
            {countryOptions.map((cc) => (
              <option key={cc} value={cc}>
                {countryEmojis[cc] || "🌐"} {cc}
              </option>
            ))}
          </select>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="11 5555 2200"
            inputMode="tel"
            className={inputClass + " flex-1"}
            style={{ fontFamily: "inherit" }}
          />
        </div>
      </div>

      {/* Nombre */}
      <div>
        <label className="block text-[12px] font-medium text-ink-2 mb-[6px]">Nombre</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tu nombre"
          className={inputClass}
          style={{ fontFamily: "inherit" }}
        />
      </div>

      {/* Email */}
      <div>
        <div className="flex justify-between items-baseline mb-[6px]">
          <label className="text-[12px] font-medium text-ink-2">Email</label>
          <span className="label-mono">Recomendado</span>
        </div>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          inputMode="email"
          autoCapitalize="off"
          autoCorrect="off"
          className={inputClass + (email && !emailValid ? " !border-danger" : "")}
          style={{ fontFamily: "inherit" }}
        />
        <p className="text-[11px] text-ink-3 mt-[6px]">
          Te enviamos la confirmación y permite gestionar tu turno desde &quot;Mi turno&quot;.
        </p>
      </div>

      {/* Notas */}
      <div>
        <div className="flex justify-between items-baseline mb-[6px]">
          <label className="text-[12px] font-medium text-ink-2">Notas</label>
          <span className="label-mono">Opcional</span>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="¿Algo que quieras avisar?"
          rows={2}
          className="w-full border border-line bg-surface rounded-sm px-[14px] py-[12px] text-[14px] text-ink-1 leading-[1.4] resize-none outline-none focus-visible:outline-[2px] focus-visible:outline-accent"
          style={{ fontFamily: "inherit" }}
        />
      </div>

      <Btn onClick={() => onContinue(name, phone, email, notes, country)} disabled={!ok} size="lg" full className="mt-[6px] gap-2">
        Revisar reserva <Icon name="forward" size={16} color="var(--bg)" />
      </Btn>
    </motion.div>
  );
}

// ─── Step: Resumen ─────────────────────────────────────────
function StepReview({ choice, onConfirm, onEdit, submitting, error, tenant }: {
  choice: ReturnType<typeof useBookingStore.getState>;
  onConfirm: () => void;
  onEdit: (step: number) => void;
  submitting: boolean;
  error: string | null;
  tenant: Tenant;
}) {
  const endTime = choice.time && choice.serviceDuration
    ? addMinutes(choice.time, choice.serviceDuration)
    : null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 380, damping: 30, delay: 0.15 }}
      className="mt-[14px]">
      <div className="bg-surface border border-line rounded-lg p-[18px_18px_20px] relative">
        <div className="label-mono mb-[12px]">Resumen de tu reserva</div>
        <SummaryRow icon="scissors" label="Servicio" value={choice.serviceName ?? ""} meta={`${choice.serviceDuration} min`} onEdit={() => onEdit(0)} />
        <SummaryRow icon="calendar" label="Fecha" value={choice.date ? formatDate(choice.date) : ""} onEdit={() => onEdit(1)} />
        <SummaryRow icon="clock" label="Horario" value={`${choice.time} – ${endTime}`} meta={choice.resourceName ? `con ${choice.resourceName}` : undefined} onEdit={() => onEdit(2)} />
        <SummaryRow icon="user" label="A nombre de" value={choice.clientName} meta={`${tenant.country_code || "+54"} ${choice.clientPhone}`} onEdit={() => onEdit(3)} isLast />
      </div>

      <div className="mt-[14px] flex items-start gap-[10px] px-[14px] py-[12px] border border-dashed border-line rounded-[12px]">
        <Icon name="shield" size={16} color="var(--ink-3)" />
        <p className="text-[11px] text-ink-2 leading-[1.5]">
          Podés cancelar sin costo hasta 2 horas antes del turno.
        </p>
      </div>

      {error && (
        <p className="text-[13px] text-danger mt-[10px] text-center">{error}</p>
      )}

      <Btn onClick={onConfirm} loading={submitting} size="lg" full className="mt-[14px] gap-2">
        {!submitting && <>Confirmar reserva <Icon name="check" size={16} color="var(--bg)" /></>}
      </Btn>
    </motion.div>
  );
}

function SummaryRow({ icon, label, value, meta, onEdit, isLast }: {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  value: string;
  meta?: string;
  onEdit: () => void;
  isLast?: boolean;
}) {
  return (
    <div className={`flex items-center gap-[12px] py-[10px] ${isLast ? "" : "border-b border-line-2"}`}>
      <div className="w-[32px] h-[32px] rounded-[8px] bg-line-2 flex items-center justify-center flex-shrink-0">
        <Icon name={icon} size={15} color="var(--ink-2)" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-mono text-[9px] text-ink-3 uppercase tracking-[0.1em]">{label}</div>
        <div className="text-[14px] font-medium text-ink-1 mt-[1px]" style={{ letterSpacing: "-0.2px" }}>{value}</div>
        {meta && <div className="text-[11px] text-ink-3 mt-[1px]">{meta}</div>}
      </div>
      <button onClick={onEdit} className="p-[6px] text-ink-3" aria-label={`Editar ${label}`}>
        <Icon name="edit" size={14} color="var(--ink-3)" />
      </button>
    </div>
  );
}

// ─── Main: BookingFlow ─────────────────────────────────────
export function BookingFlow({ tenant, services, resources }: {
  tenant: Tenant;
  services: Service[];
  resources: Resource[];
}) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const store = useBookingStore();
  const [typing, setTyping] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const initials = tenant.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  // Scroll al final cuando cambia el paso o aparece el typing indicator
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      }, 60);
    }
  }, [store.step, typing]);

  // Typing indicator antes de avanzar el paso del asistente
  const goNext = useCallback(() => {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      store.nextStep();
    }, 650);
  }, [store]);

  const handleBack = () => {
    if (store.step === 0) {
      router.push(`/${tenant.slug}`);
      return;
    }
    store.goToStep(store.step - 1);
  };

  const handleService = (svc: Service) => {
    store.setService(svc.id, svc.name, svc.duration_minutes, svc.price ?? null);
    goNext();
  };

  const handleDate = (date: string) => {
    store.setDate(date);
    goNext();
  };

  const handleTime = (time: string, resourceId: string, resourceName: string) => {
    store.setTime(time, resourceId, resourceName);
    goNext();
  };

  const [selectedCountry, setSelectedCountry] = useState(tenant.country_code || "+54");

  const handleDetails = (name: string, phone: string, email: string, notes: string, country: string) => {
    store.setDetails(name, phone, email, notes);
    setSelectedCountry(country);
    goNext();
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const countryCode = selectedCountry || tenant.country_code || "+54";
      const appt = await api.post<{ id: string }>("/appointments", {
        tenant_id: tenant.id,
        service_id: store.serviceId,
        resource_id: store.resourceId,
        date: store.date,
        time: store.time,
        client_phone: `${countryCode}${store.clientPhone.replace(/\D/g, "")}`,
        client_name: store.clientName,
        client_email: store.clientEmail.trim() || undefined,
        notes: store.notes || undefined,
        source: "web",
      });
      store.confirm(appt.id, tenant.name, tenant.address, initials, countryCode);
      router.push(`/${tenant.slug}/reservar/ok`);
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : "No se pudo confirmar. Intentá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const progress = ((store.step + 1) / 5) * 100;

  return (
    <div className="min-h-screen bg-bg flex flex-col" style={{ maxWidth: 430, margin: "0 auto" }}>
      {/* ── Header ── */}
      <div className="px-[20px] pt-[8px] pb-[14px] flex-shrink-0">
        <div className="flex items-center gap-[12px] mb-[14px]">
          <button
            onClick={handleBack}
            className="press-fx w-[36px] h-[36px] rounded-full flex items-center justify-center"
            aria-label="Volver"
          >
            <Icon name="back" size={20} color="var(--ink-1)" />
          </button>
          <div className="flex items-center gap-[10px] flex-1 min-w-0">
            <BrandMark initials={initials} size={30} />
            <div className="min-w-0">
              <div className="text-[13px] font-semibold" style={{ letterSpacing: "-0.2px", lineHeight: 1.1 }}>
                {tenant.name}
              </div>
              <div className="font-mono text-[10px] text-ink-3 mt-[2px]" style={{ letterSpacing: "0.05em" }}>
                Paso {store.step + 1} de 5
              </div>
            </div>
          </div>
        </div>
        {/* Barra de progreso */}
        <div className="h-[3px] bg-line rounded-[2px] overflow-hidden">
          <div
            className="h-full bg-ink-1 rounded-[2px]"
            style={{ width: `${progress}%`, transition: "width 0.5s cubic-bezier(0.22, 1, 0.36, 1)" }}
          />
        </div>
      </div>

      {/* ── Chat scroll ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-[20px] pb-[24px] hide-scroll">

        {/* Introducción */}
        <AssistantMsg delay={0}>
          <span>¡Hola! 👋 Soy el asistente de <strong>{tenant.name}</strong>.</span>
          <br />
          <span>Te ayudo a reservar tu turno en pocos pasos.</span>
        </AssistantMsg>

        {/* Paso 0 — Servicio */}
        <AssistantMsg delay={200}>¿Qué servicio querés reservar?</AssistantMsg>
        {store.step > 0 && store.serviceName && <UserMsg>{store.serviceName}</UserMsg>}
        {store.step === 0 && (
          <StepServices
            services={services}
            locale={tenant.locale}
            currency={tenant.currency}
            onPick={handleService}
          />
        )}

        {/* Paso 1 — Fecha */}
        {store.step >= 1 && (
          <AssistantMsg delay={100}>Perfecto. ¿Para qué día?</AssistantMsg>
        )}
        {store.step > 1 && store.date && <UserMsg>{formatDate(store.date)}</UserMsg>}
        {store.step === 1 && (
          <StepDate
            tenantId={tenant.id}
            serviceId={store.serviceId!}
            onPick={handleDate}
          />
        )}

        {/* Paso 2 — Hora */}
        {store.step >= 2 && (
          <AssistantMsg delay={100}>Buenísimo. Estos son los horarios disponibles:</AssistantMsg>
        )}
        {store.step > 2 && store.time && (
          <UserMsg>{store.time}{store.resourceName ? ` · con ${store.resourceName}` : ""}</UserMsg>
        )}
        {store.step === 2 && store.date && store.serviceId && (
          <StepTime
            tenantId={tenant.id}
            serviceId={store.serviceId}
            date={store.date}
            resources={resources}
            onPick={handleTime}
          />
        )}

        {/* Paso 3 — Datos */}
        {store.step >= 3 && (
          <AssistantMsg delay={100}>Último paso. Necesito tus datos para confirmar.</AssistantMsg>
        )}
        {store.step > 3 && (
          <UserMsg>{store.clientName} · {tenant.country_code || "+54"} {store.clientPhone}</UserMsg>
        )}
        {store.step === 3 && (
          <StepDetails
            initial={{
              name: store.clientName,
              phone: store.clientPhone,
              email: store.clientEmail,
              notes: store.notes,
            }}
            onContinue={(name, phone, email, notes, country) => handleDetails(name, phone, email, notes, country)}
            countryCode={tenant.country_code || "+54"}
          />
        )}

        {/* Paso 4 — Resumen */}
        {store.step === 4 && (
          <>
            <AssistantMsg delay={100}>Revisá tu reserva antes de confirmar.</AssistantMsg>
            <StepReview
              choice={store}
              onConfirm={handleConfirm}
              onEdit={store.goToStep}
              submitting={submitting}
              error={submitError}
              tenant={tenant}
            />
          </>
        )}

        {/* Typing indicator */}
        <AnimatePresence>{typing && <TypingBubble />}</AnimatePresence>

        <div className="h-[20px]" />
      </div>
    </div>
  );
}
