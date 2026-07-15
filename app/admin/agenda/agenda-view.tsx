"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { usePushNotifications } from "@/lib/use-push-notifications";
import { isAppointmentPast } from "@/lib/use-notifications-feed";
import type { Appointment, AvailableSlot, BlockedSlot, Resource, Service } from "@/types/api";
import { expandFullDayBlocks } from "@/lib/blocked-dates";
import { todayInTimezone, nowTimeInTimezone, addDays } from "@/lib/timezone-utils";
import { useAdminStore } from "@/store/admin";
import { AdminHeader } from "@/components/admin/admin-header";
import { BottomSheet } from "@/components/admin/bottom-sheet";
import { FAB } from "@/components/admin/fab";
import { ResourceAvatar } from "@/components/ui/resource-avatar";
import { StatusPill, SourcePill } from "@/components/ui/status-pill";
import { Btn } from "@/components/ui/btn";
import { Icon } from "@/components/ui/icon";

// ─── Helpers ───────────────────────────────────────────────
function formatDateLabel(dateStr: string, today: string) {
  if (dateStr === today) return "Hoy";
  if (dateStr === addDays(today, 1)) return "Mañana";
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${days[date.getDay()]} ${d} ${months[m - 1]}`;
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return `${days[date.getDay()]} ${d} de ${months[m - 1]}`;
}

function addMinutes(time: string, mins: number) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function getWeekDates(fromDate: string): string[] {
  const [y, m, d] = fromDate.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay(); // 0=Dom … 6=Sáb
  const mondayOffset = -((dow + 6) % 7); // días hasta el lunes de esa semana
  const monday = addDays(fromDate, mondayOffset);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

// ─── Day view timeline — layout proporcional a la duración ─
const PX_PER_MIN = 1.2; // 1 minuto = 1.2px → 1h = 72px
const START_HOUR = 9;
const END_HOUR = 21;
const TOTAL_MINS = (END_HOUR - START_HOUR) * 60;

function timeToMins(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Asigna a cada turno una columna dentro de su "cluster" de solapamiento.
 *
 * Algoritmo clásico tipo Google Calendar:
 *   1) ordenar por hora de inicio
 *   2) agrupar en clusters mientras haya overlap transitivo
 *   3) dentro de cada cluster, asignar a cada turno la columna más a la izquierda
 *      donde no se pisa con otro de la misma columna
 *
 * Resultado: en vista "todos", dos profesionales con turnos al mismo tiempo
 * aparecen lado a lado (cada uno ocupando 1/N del ancho), sin taparse.
 */
type ApptLayout = { col: number; totalCols: number };

function computeOverlapLayout(appts: Appointment[]): Map<string, ApptLayout> {
  type Item = { id: string; startMin: number; endMin: number };
  const items: Item[] = appts.map((a) => {
    const start = timeToMins(a.time);
    const duration = a.service?.duration_minutes ?? 30;
    return { id: a.id, startMin: start, endMin: start + duration };
  });
  // Ordenar por inicio (y por fin como desempate, mejora la agrupación)
  items.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  // 1) Partir en clusters: items que se tocan transitivamente
  const clusters: Item[][] = [];
  let current: Item[] = [];
  let currentEnd = -Infinity;
  for (const item of items) {
    if (item.startMin >= currentEnd && current.length > 0) {
      clusters.push(current);
      current = [];
      currentEnd = -Infinity;
    }
    current.push(item);
    currentEnd = Math.max(currentEnd, item.endMin);
  }
  if (current.length) clusters.push(current);

  // 2) Asignar columna a cada item dentro del cluster
  const out = new Map<string, ApptLayout>();
  for (const cluster of clusters) {
    const cols: Item[][] = []; // cada col guarda los items ya colocados
    for (const item of cluster) {
      let placed = false;
      for (let c = 0; c < cols.length; c++) {
        const last = cols[c][cols[c].length - 1];
        if (last.endMin <= item.startMin) {
          cols[c].push(item);
          out.set(item.id, { col: c, totalCols: 0 }); // totalCols se setea abajo
          placed = true;
          break;
        }
      }
      if (!placed) {
        cols.push([item]);
        out.set(item.id, { col: cols.length - 1, totalCols: 0 });
      }
    }
    const totalCols = cols.length;
    for (const colItems of cols) {
      for (const item of colItems) {
        out.set(item.id, { col: out.get(item.id)!.col, totalCols });
      }
    }
  }
  return out;
}

function DayView({ appointments, resources, onOpen, onCreateAt, timezone, showNow }: {
  appointments: Appointment[];
  resources: Resource[];
  onOpen: (a: Appointment) => void;
  onCreateAt: (time: string) => void;
  timezone: string;
  showNow: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const firstApptRef = useRef<HTMLButtonElement>(null);
  const totalHeight = TOTAL_MINS * PX_PER_MIN;

  // Calcular layout de columnas para turnos solapados.
  // Recalcula solo cuando cambia el set de turnos — barato porque es O(n log n).
  const layoutById = useMemo(() => computeOverlapLayout(appointments), [appointments]);

  // Scroll al primer turno cuando cambian los appointments
  useEffect(() => {
    if (firstApptRef.current && containerRef.current) {
      setTimeout(() => {
        firstApptRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [appointments]);

  // Filas horizontales cada hora
  const hourLines = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  // Filas clicables cada 30 min para crear turno
  const clickSlots: string[] = [];
  for (let h = START_HOUR; h < END_HOUR; h++) {
    for (const m of [0, 30]) {
      clickSlots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }

  return (
    <div className="flex gap-[10px]" style={{ height: totalHeight }}>
      {/* Columna de horas */}
      <div className="flex-shrink-0 relative" style={{ width: 40, height: totalHeight }}>
        {hourLines.map((h) => {
          const top = (h - START_HOUR) * 60 * PX_PER_MIN;
          return (
            <div
              key={h}
              className="absolute font-mono text-[11px] text-ink-2"
              style={{ top, lineHeight: 1, transform: "translateY(-50%)" }}
            >
              {`${String(h).padStart(2, "0")}:00`}
            </div>
          );
        })}
      </div>

      {/* Área de turnos */}
      <div className="flex-1 relative" style={{ height: totalHeight }}>
        {/* Grid lines cada hora */}
        {hourLines.map((h) => (
          <div
            key={h}
            className="absolute left-0 right-0 border-t border-line-2"
            style={{ top: (h - START_HOUR) * 60 * PX_PER_MIN }}
          />
        ))}

        {/* Slots clicables invisibles cada 30 min */}
        {clickSlots.map((slot) => {
          const mins = timeToMins(slot) - START_HOUR * 60;
          return (
            <button
              key={slot}
              onClick={() => onCreateAt(slot)}
              className="absolute left-0 right-0 hover:bg-line-2/50 transition-colors rounded-[4px] group"
              style={{ top: mins * PX_PER_MIN, height: 30 * PX_PER_MIN, background: "transparent", border: 0, cursor: "pointer" }}
              title={`+ Turno a las ${slot}`}
            >
              <span className="opacity-0 group-hover:opacity-100 text-[10px] text-ink-3 pl-[6px] transition-opacity">
                + {slot}
              </span>
            </button>
          );
        })}

        {/* Bloques de turno con altura proporcional a la duración */}
        {appointments.map((appt, idx) => {
          const resource = resources.find((r) => r.id === appt.resource_id);
          const startMins = timeToMins(appt.time) - START_HOUR * 60;
          const duration = appt.service?.duration_minutes ?? 30;
          const height = Math.max(duration * PX_PER_MIN, 38); // mínimo 38px
          const statusBorder = {
            confirmed: "var(--status-confirmed)",
            pending:   "var(--status-pending)",
            cancelled: "var(--ink-3)",
          }[appt.status] ?? "var(--line)";

          if (startMins < 0 || startMins >= TOTAL_MINS) return null;

          // Marcar el primer turno para scroll
          const isFirst = idx === 0;

          // Layout horizontal: si hay overlap, dividimos el ancho entre N columnas.
          // Sin overlap (totalCols=1), el bloque ocupa todo el ancho como antes.
          const layout = layoutById.get(appt.id) ?? { col: 0, totalCols: 1 };
          const colWidthPct = 100 / layout.totalCols;
          const gapPx = layout.totalCols > 1 ? 3 : 0; // separación entre columnas
          const isNarrow = layout.totalCols > 1;
          const hue = (resource as Resource & { hue?: number })?.hue ?? 24;
          // Banda lateral con el color del recurso — refuerzo visual cuando hay
          // varias columnas, así se distingue de quién es el turno de un vistazo.
          const resourceAccent = resource ? `oklch(0.62 0.13 ${hue})` : "var(--line)";

          return (
            <button
              ref={isFirst ? firstApptRef : null}
              key={appt.id}
              onClick={() => onOpen(appt)}
              className="press-fx absolute bg-surface rounded-[8px] py-[6px] flex items-start gap-[6px] text-left overflow-hidden"
              style={{
                top: startMins * PX_PER_MIN,
                height,
                left: `calc(${layout.col * colWidthPct}% + ${gapPx / 2}px)`,
                width: `calc(${colWidthPct}% - ${gapPx}px)`,
                paddingLeft: 8,
                paddingRight: isNarrow ? 6 : 10,
                border: "1px solid var(--line)",
                borderLeft: `3px solid ${statusBorder}`,
                // Sombra muy sutil del color del recurso a la izquierda — sirve
                // como "tab" de identidad sin gastar más ancho horizontal.
                boxShadow: `inset 6px 0 0 -3px ${resourceAccent}`,
                fontFamily: "inherit",
                zIndex: 10,
              }}
              title={resource ? `${appt.client?.name ?? "Cliente"} · ${resource.name}` : appt.client?.name ?? "Cliente"}
            >
              {resource && !isNarrow && (
                <ResourceAvatar
                  initials={resource.name.slice(0, 2).toUpperCase()}
                  hue={hue}
                  size={height > 50 ? 28 : 20}
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-[4px] flex-wrap">
                  <span className="font-mono text-[11px] font-semibold text-ink-1">{appt.time}</span>
                  {!isNarrow && (
                    <span className="text-[10px] text-ink-3">· {duration}min</span>
                  )}
                  {isNarrow && resource && (
                    // En modo angosto reemplazamos el avatar grande por un chip mini
                    // del profesional, así sigue identificándose sin ocupar espacio.
                    <span
                      className="text-[9px] font-semibold uppercase tracking-[0.04em] px-[5px] py-[1px] rounded-[4px]"
                      style={{
                        background: `oklch(0.92 0.04 ${hue})`,
                        color: `oklch(0.32 0.10 ${hue})`,
                      }}
                    >
                      {resource.name.split(" ")[0]}
                    </span>
                  )}
                </div>
                {height > 44 && (
                  <div className="text-[12px] font-medium text-ink-1 truncate mt-[1px]">
                    {appt.client?.name ?? "Cliente"}
                  </div>
                )}
                {height > 62 && !isNarrow && (
                  <div className="text-[10px] text-ink-3 truncate">{appt.service?.name}</div>
                )}
              </div>
              {height > 50 && !isNarrow && (
                <StatusPill status={appt.status as "pending" | "confirmed" | "cancelled"} />
              )}
            </button>
          );
        })}

        {/* Línea "ahora" — solo cuando se está viendo el día de hoy */}
        {showNow && <NowLine timezone={timezone} />}
      </div>
    </div>
  );
}

function NowLine({ timezone }: { timezone: string }) {
  const [nowHH, nowMM] = nowTimeInTimezone(timezone).split(":").map(Number);
  const mins = nowHH * 60 + nowMM - START_HOUR * 60;
  if (mins < 0 || mins > TOTAL_MINS) return null;
  const top = mins * PX_PER_MIN;
  return (
    <div className="absolute left-0 right-0 flex items-center gap-[4px] z-20 pointer-events-none" style={{ top }}>
      <div className="w-[8px] h-[8px] rounded-full bg-accent flex-shrink-0" />
      <div className="flex-1 h-[1.5px] bg-accent" />
    </div>
  );
}

// ─── Week view ─────────────────────────────────────────────
function WeekView({ weekDates, appointments, blockedDates, onDayClick, today }: {
  weekDates: string[];
  appointments: Appointment[];
  blockedDates: Set<string>;
  onDayClick: (date: string) => void;
  today: string;
}) {
  const countByDate = weekDates.reduce<Record<string, number>>((acc, d) => {
    acc[d] = appointments.filter((a) => a.date === d && a.status !== "cancelled").length;
    return acc;
  }, {});
  const max = Math.max(...Object.values(countByDate), 1);

  const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  return (
    <div className="flex flex-col gap-[8px]">
      {weekDates.map((date, i) => {
        const isToday = date === today;
        const isBlocked = blockedDates.has(date);
        const count = countByDate[date] ?? 0;
        const [, , d] = date.split("-").map(Number);
        return (
          <button
            key={date}
            onClick={() => onDayClick(date)}
            className="press-fx flex items-center gap-[14px] px-[16px] py-[14px] rounded text-left w-full"
            style={{
              background: isToday
                ? "var(--ink-1)"
                : isBlocked
                ? "var(--line-2)"
                : "var(--surface)",
              color: isToday ? "var(--bg)" : "var(--ink-1)",
              border: `1px solid ${isToday ? "var(--ink-1)" : "var(--line)"}`,
              fontFamily: "inherit",
              opacity: isBlocked && !isToday ? 0.7 : 1,
            }}
          >
            <div style={{ width: 44 }}>
              <div className="font-mono text-[10px] uppercase tracking-[0.05em]" style={{ opacity: 0.7 }}>{dayNames[i]}</div>
              <div className="font-serif text-[26px] leading-[1] mt-[2px]" style={{ letterSpacing: "-0.5px" }}>{d}</div>
            </div>
            <div className="flex-1">
              {isBlocked ? (
                <div className="text-[13px] flex items-center gap-[6px]" style={{ opacity: 0.75 }}>
                  <Icon name="lock" size={12} color={isToday ? "rgba(255,255,255,0.7)" : "var(--ink-2)"} />
                  Bloqueado
                </div>
              ) : count === 0 ? (
                <div className="text-[13px] opacity-50">Sin turnos</div>
              ) : (
                <>
                  <div className="text-[14px] font-medium">{count} turno{count !== 1 ? "s" : ""}</div>
                  <div className="h-[4px] rounded-[2px] mt-[8px] overflow-hidden" style={{ background: isToday ? "rgba(255,255,255,0.15)" : "var(--line-2)" }}>
                    <div
                      className="h-full rounded-[2px]"
                      style={{ width: `${(count / max) * 100}%`, background: isToday ? "var(--accent)" : "var(--ink-1)" }}
                    />
                  </div>
                </>
              )}
            </div>
            <Icon name="chevronRight" size={14} color={isToday ? "rgba(255,255,255,0.5)" : "var(--ink-3)"} />
          </button>
        );
      })}
    </div>
  );
}

// ─── Appointment detail sheet ──────────────────────────────
function ApptDetailSheet({ appt, resources, onClose, onConfirm, onCancel, onNotesChange, onPriceChange, loading }: {
  appt: Appointment | null;
  resources: Resource[];
  onClose: () => void;
  onConfirm: () => void;
  onCancel: (alsoBlockSlot: boolean) => void;
  onNotesChange: (notes: string) => void;
  onPriceChange: (price: number | null) => void;
  loading?: boolean;
}) {
  // sub-estado interno: cuando el admin aprieta "Cancelar turno" mostramos
  // un panel intermedio que pregunta si además bloqueamos el horario.
  // Esto evita el doble efecto de "cliente cancela y otro reserva en su lugar".
  const [cancelStage, setCancelStage] = useState<"normal" | "choose">("normal");

  // Resetear el sub-estado cuando se cierra el sheet o cambia el turno
  useEffect(() => {
    if (!appt) setCancelStage("normal");
  }, [appt]);

  const resource = resources.find((r) => r.id === appt?.resource_id);
  const endTime = appt?.time && appt.service?.duration_minutes
    ? addMinutes(appt.time, appt.service.duration_minutes)
    : appt?.end_time ?? "";

  const initials = appt?.client?.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() ?? "??";

  const waLink = appt?.client?.phone
    ? `https://wa.me/${appt.client.phone.replace(/\D/g, "")}`
    : "#";

  const handleCloseSheet = () => {
    setCancelStage("normal");
    onClose();
  };

  return (
    <BottomSheet open={!!appt} onClose={handleCloseSheet} title={cancelStage === "choose" ? "Cancelar turno" : "Detalle del turno"}>
      {appt && cancelStage === "choose" && (
        <div className="flex flex-col gap-[12px]">
          <p className="text-[14px] text-ink-2 leading-[1.5]">
            Vas a cancelar el turno de <strong className="text-ink-1">{appt.client?.name ?? "el cliente"}</strong>{" "}
            de las <span className="font-mono">{appt.time}</span>.
          </p>
          <p className="text-[13px] text-ink-3 leading-[1.4]">
            ¿Querés también <strong className="text-ink-2">bloquear ese horario</strong> para que nadie más pueda reservarlo?
          </p>

          <button
            onClick={() => onCancel(true)}
            disabled={loading}
            className="press-fx flex flex-col items-start gap-[4px] px-[16px] py-[14px] rounded text-left w-full mt-[8px] disabled:opacity-50"
            style={{
              background: "var(--ink-1)",
              color: "var(--bg)",
              border: "1px solid var(--ink-1)",
              fontFamily: "inherit",
              cursor: loading ? "not-allowed" : "pointer",
            }}
            type="button"
          >
            <span className="text-[14px] font-semibold inline-flex items-center gap-[8px]">
              <Icon name="shield" size={14} color="var(--bg)" />
              Cancelar y bloquear el horario
            </span>
            <span className="text-[12px]" style={{ opacity: 0.7 }}>
              Recomendado si el cliente avisó que no podía. El slot queda cerrado a nuevas reservas.
            </span>
          </button>

          <button
            onClick={() => onCancel(false)}
            disabled={loading}
            className="press-fx flex flex-col items-start gap-[4px] px-[16px] py-[14px] rounded text-left w-full disabled:opacity-50"
            style={{
              background: "var(--surface)",
              color: "var(--ink-1)",
              border: "1px solid var(--line)",
              fontFamily: "inherit",
              cursor: loading ? "not-allowed" : "pointer",
            }}
            type="button"
          >
            <span className="text-[14px] font-semibold">
              Solo cancelar (dejar disponible)
            </span>
            <span className="text-[12px] text-ink-3">
              El horario vuelve a aparecer libre. Útil si fue un error o si querés re-asignar.
            </span>
          </button>

          <button
            onClick={() => setCancelStage("normal")}
            disabled={loading}
            className="press-fx text-[13px] text-ink-2 underline underline-offset-4 self-center mt-[6px] disabled:opacity-50"
            style={{ background: "transparent", border: 0, cursor: loading ? "not-allowed" : "pointer", padding: "8px 0" }}
            type="button"
          >
            Volver atrás
          </button>

          {loading && (
            <p className="text-[12px] text-ink-3 text-center mt-[4px]">Procesando…</p>
          )}
        </div>
      )}
      {appt && cancelStage === "normal" && (
        <div>
          {/* Status + source + code */}
          <div className="flex items-center gap-[10px] mb-[16px] flex-wrap">
            <StatusPill status={appt.status as "pending" | "confirmed" | "cancelled"} />
            <SourcePill source={appt.source as "whatsapp" | "web" | "manual"} />
            {appt.is_overbooking && (
              <span
                className="text-[10px] font-medium uppercase tracking-[0.05em] px-[8px] py-[3px] rounded-full"
                style={{ background: "#fdece7", color: "#c45a3c" }}
              >
                Sobre-turno
              </span>
            )}
            <span className="font-mono text-[10px] text-ink-3 ml-auto">
              #{appt.id.slice(0, 8).toUpperCase()}
            </span>
          </div>

          {/* Service card */}
          <div className="bg-surface border border-line rounded px-[18px] py-[16px] mb-[14px]">
            <div className="text-card-title font-semibold" style={{ letterSpacing: "-0.3px", lineHeight: 1.2 }}>
              {appt.service?.name ?? "Turno"}
            </div>
            <div className="text-[13px] text-ink-3 mt-[3px]">
              {appt.service?.duration_minutes ?? "—"} min
            </div>
            <div className="h-[1px] bg-line-2 my-[14px]" />
            <div className="grid grid-cols-3 gap-[8px]">
              <div>
                <div className="label-mono">Fecha</div>
                <div className="text-[13px] font-medium mt-[3px]">{formatDate(appt.date).split(" ").slice(0, 3).join(" ")}</div>
              </div>
              <div>
                <div className="label-mono">Horario</div>
                <div className="font-mono text-[13px] font-medium mt-[3px]">{appt.time}–{endTime}</div>
              </div>
              <div>
                <div className="label-mono">Profesional</div>
                <div className="text-[13px] font-medium mt-[3px] flex items-center gap-[4px]">
                  {resource && <ResourceAvatar initials={resource.name.slice(0, 2).toUpperCase()} hue={(resource as Resource & { hue?: number }).hue ?? 24} size={18} />}
                  {resource?.name ?? "—"}
                </div>
              </div>
            </div>
          </div>

          {/* Client card */}
          <div className="label-mono my-[8px]">Cliente</div>
          <div className="bg-surface border border-line rounded px-[16px] py-[14px] mb-[14px]">
            <div className="flex items-center gap-[12px]">
              <div className="w-[40px] h-[40px] rounded-full bg-line-2 flex items-center justify-center font-semibold text-[14px] text-ink-1 flex-shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold" style={{ letterSpacing: "-0.2px" }}>{appt.client?.name ?? "Desconocido"}</div>
                <div className="font-mono text-[12px] text-ink-2 mt-[2px]">{appt.client?.phone}</div>
              </div>
              {appt.client?.phone && (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-[38px] h-[38px] rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "#25D366" }}
                >
                  <Icon name="whatsapp" size={18} color="white" />
                </a>
              )}
            </div>
            {appt.client && (
              <div className="flex gap-[10px] mt-[12px] pt-[12px] border-t border-line-2 text-[12px]">
                <span className="text-ink-2">Historial:</span>
                <span className="font-medium text-ink-1">ver en clientes</span>
              </div>
            )}
          </div>

          {/* Precio */}
          <PriceOverrideField appt={appt} onChange={onPriceChange} />

          {/* Notas */}
          <div className="label-mono my-[8px]">Notas</div>
          <textarea
            defaultValue={appt.notes ?? ""}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Agregar notas..."
            rows={2}
            className="w-full border border-line bg-surface rounded-sm px-[12px] py-[10px] text-[13px] text-ink-1 resize-none outline-none focus-visible:outline-[2px] focus-visible:outline-accent"
            style={{ fontFamily: "inherit" }}
          />

          {/* Actions */}
          <div className="flex flex-col gap-[8px] mt-[20px]">
            {appt.status === "pending" && !isAppointmentPast(appt) && (
              <Btn onClick={onConfirm} loading={loading} disabled={loading} size="lg" full className="gap-2">
                {!loading && <><Icon name="check" size={16} color="var(--bg)" /> Confirmar turno</>}
                {loading && "Confirmando..."}
              </Btn>
            )}
            {appt.status === "pending" && isAppointmentPast(appt) && (
              <div
                className="text-[12px] text-ink-3 text-center px-[12px] py-[10px] rounded"
                style={{ background: "var(--line-2)" }}
              >
                Este turno ya venció y no puede confirmarse.
              </div>
            )}
            {appt.status !== "cancelled" && (
              <Btn variant="secondary" size="lg" full onClick={() => setCancelStage("choose")} disabled={loading} className="text-danger">
                Cancelar turno
              </Btn>
            )}
          </div>
        </div>
      )}
    </BottomSheet>
  );
}

// ─── Price override field (en el detalle) ──────────────────
function PriceOverrideField({
  appt,
  onChange,
}: {
  appt: Appointment;
  onChange: (price: number | null) => void;
}) {
  const servicePrice =
    appt.service?.price == null
      ? null
      : typeof appt.service.price === "string"
      ? parseFloat(appt.service.price)
      : Number(appt.service.price);
  const overrideRaw = appt.price_override;
  const overrideNum =
    overrideRaw == null
      ? null
      : typeof overrideRaw === "string"
      ? parseFloat(overrideRaw)
      : Number(overrideRaw);
  const hasOverride = overrideNum != null && !Number.isNaN(overrideNum);

  const [value, setValue] = useState<string>(
    hasOverride
      ? String(overrideNum)
      : servicePrice != null
      ? String(servicePrice)
      : "",
  );

  // Re-sincronizar si cambia el turno seleccionado (mismo sheet, otro appt)
  useEffect(() => {
    setValue(
      hasOverride
        ? String(overrideNum)
        : servicePrice != null
        ? String(servicePrice)
        : "",
    );
    // intencional: depende del id del turno
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appt.id]);

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed === "") {
      // Vacío = volver al precio del servicio
      if (hasOverride) onChange(null);
      return;
    }
    const parsed = Number(trimmed);
    if (Number.isNaN(parsed) || parsed < 0) return;
    if (parsed === servicePrice) {
      if (hasOverride) onChange(null);
      return;
    }
    if (parsed !== overrideNum) onChange(parsed);
  };

  const resetToService = () => {
    if (servicePrice != null) setValue(String(servicePrice));
    if (hasOverride) onChange(null);
  };

  return (
    <>
      <div className="label-mono my-[8px] flex items-center justify-between">
        <span>Precio cobrado</span>
        {hasOverride && (
          <button
            onClick={resetToService}
            className="text-[10px] text-ink-2 underline underline-offset-2"
            style={{ background: "transparent", border: 0, cursor: "pointer", padding: 0 }}
            type="button"
          >
            Volver al precio del servicio
          </button>
        )}
      </div>
      <div className="flex items-center gap-[8px]">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          placeholder={servicePrice != null ? String(servicePrice) : "0"}
          className="w-full h-[40px] px-[12px] border border-line bg-surface rounded-sm text-[14px] text-ink-1 outline-none focus-visible:outline-[2px] focus-visible:outline-accent font-mono"
          style={{ fontFamily: "inherit" }}
        />
        {hasOverride && servicePrice != null && (
          <span className="text-[11px] text-ink-3 font-mono whitespace-nowrap">
            base {servicePrice}
          </span>
        )}
      </div>
    </>
  );
}

// ─── Create appointment sheet ──────────────────────────────
function CreateApptSheet({ open, onClose, initialTime, services, resources, tenantId }: {
  open: boolean;
  onClose: () => void;
  initialTime: string | null;
  services: Service[];
  resources: Resource[];
  tenantId: string;
}) {
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedResource, setSelectedResource] = useState<string>("");
  // Si el sheet se abrió clickeando un horario, `initialTime` lo define.
  // Si se abrió desde el FAB, arranca null y el admin lo elige acá.
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  // Sobre-turno: deja al admin meter un turno fuera del slot grid normal.
  // Cuando está prendido, mostramos un input libre de hora y no se valida
  // contra availability.
  const [isOverbook, setIsOverbook] = useState(false);
  const [overbookTime, setOverbookTime] = useState<string>("");
  // Precio override opcional. Vacío = usa precio del servicio.
  const [priceOverride, setPriceOverride] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { selectedDate } = useAdminStore();

  useEffect(() => {
    if (!open) {
      setSelectedService(null);
      setPhone("");
      setName("");
      setSelectedResource("");
      setSelectedTime(null);
      setIsOverbook(false);
      setOverbookTime("");
      setPriceOverride("");
    } else {
      // Cada vez que abrimos, arrancamos con la hora elegida (si vino) y el
      // resto en limpio.
      setSelectedTime(initialTime);
    }
  }, [open, initialTime]);

  // Cargamos los slots disponibles cuando hay servicio elegido. Solo se usa
  // cuando el admin abrió el sheet desde el FAB (initialTime === null), pero
  // dejamos siempre habilitada la query para que pueda *cambiar* la hora
  // incluso si entró por un slot específico.
  const { data: slots = [], isLoading: loadingSlots } = useQuery({
    queryKey: ["available-slots", tenantId, selectedService?.id, selectedDate],
    queryFn: () =>
      api.get<AvailableSlot[]>(
        `/availability/slots?tenantId=${tenantId}&serviceId=${selectedService!.id}&date=${selectedDate}`,
      ),
    enabled: open && !!selectedService,
  });

  // Si el slot que estaba elegido ya no aparece (cambió el servicio o el día),
  // lo limpiamos para que el admin re-elija — evita enviar un time inválido.
  useEffect(() => {
    if (!selectedTime || !selectedService) return;
    if (loadingSlots) return;
    const stillAvailable = slots.some((s) => s.slot === selectedTime);
    if (!stillAvailable) setSelectedTime(null);
  }, [slots, selectedService, selectedTime, loadingSlots]);

  const effectiveTime = isOverbook ? overbookTime : selectedTime;
  const canSubmit =
    !!selectedService &&
    !!effectiveTime &&
    /^\d{2}:\d{2}$/.test(effectiveTime) &&
    phone.replace(/\D/g, "").length >= 8;

  const handleCreate = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const parsedPrice = priceOverride.trim() === ""
        ? undefined
        : Number(priceOverride);
      const priceOk =
        parsedPrice === undefined ||
        (Number.isFinite(parsedPrice) && parsedPrice >= 0);
      // Mandamos el teléfono tal cual lo tipeó el admin. El backend lo
      // normaliza a E.164 (+54 9 ...) y dedupea contra clientes existentes,
      // así si el cliente ya tiene email cargado, lo reutiliza para mandarle
      // confirmación.
      await api.post("/appointments", {
        tenant_id: tenantId,
        service_id: selectedService!.id,
        resource_id: selectedResource || undefined,
        date: selectedDate,
        time: effectiveTime!,
        client_phone: phone,
        client_name: name || "Cliente",
        source: "manual",
        is_overbooking: isOverbook || undefined,
        price_override: priceOk ? parsedPrice : undefined,
      });
      onClose();
    } catch {
      // silently ignore for now
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Nuevo turno">
      <div className="flex flex-col gap-[12px]">
        {/* Fecha */}
        <div className="bg-surface border border-line rounded px-[14px] py-[12px] flex items-center gap-[14px]">
          <div className="flex-1">
            <div className="label-mono">Fecha</div>
            <div className="text-[14px] font-medium mt-[2px]">
              {formatDate(selectedDate)}
            </div>
          </div>
        </div>

        {/* Servicio */}
        <div>
          <label className="text-[12px] font-medium text-ink-2 block mb-[6px]">Servicio</label>
          <div className="flex flex-col gap-[6px] max-h-[220px] overflow-y-auto hide-scroll">
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedService(s)}
                className="press-fx flex items-center gap-[10px] px-[12px] py-[10px] rounded-sm text-left w-full"
                style={{
                  background: selectedService?.id === s.id ? "var(--ink-1)" : "var(--surface)",
                  color: selectedService?.id === s.id ? "var(--bg)" : "var(--ink-1)",
                  border: `1px solid ${selectedService?.id === s.id ? "var(--ink-1)" : "var(--line)"}`,
                  fontFamily: "inherit",
                }}
              >
                <span className="flex-1 text-[13px] font-medium">{s.name}</span>
                <span className="font-mono text-[11px] opacity-70">{s.duration_minutes}min</span>
              </button>
            ))}
          </div>
        </div>

        {/* Horario */}
        <div>
          <div className="flex justify-between items-baseline mb-[6px]">
            <label className="text-[12px] font-medium text-ink-2">Horario</label>
            {!isOverbook && selectedTime && (
              <span className="font-mono text-[11px] text-ink-3">
                {selectedTime}
              </span>
            )}
          </div>
          {!selectedService && (
            <div className="text-[12px] text-ink-3 bg-surface border border-line rounded-sm px-[12px] py-[10px]">
              Elegí un servicio para ver los horarios disponibles.
            </div>
          )}
          {selectedService && isOverbook && (
            <input
              type="time"
              value={overbookTime}
              onChange={(e) => setOverbookTime(e.target.value)}
              className="w-full h-[40px] px-[12px] border border-line bg-surface rounded-sm text-[14px] text-ink-1 outline-none focus-visible:outline-[2px] focus-visible:outline-accent font-mono"
              style={{ fontFamily: "inherit" }}
            />
          )}
          {selectedService && !isOverbook && loadingSlots && (
            <div className="flex gap-[6px]">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-[36px] w-[64px] rounded-[8px] bg-line-2 animate-pulse" />
              ))}
            </div>
          )}
          {selectedService && !isOverbook && !loadingSlots && slots.length === 0 && (
            <div className="text-[12px] text-ink-3 bg-surface border border-line rounded-sm px-[12px] py-[10px]">
              No hay horarios disponibles para este servicio el {formatDate(selectedDate)}. Activá "Sobre-turno" para forzar uno.
            </div>
          )}
          {selectedService && !isOverbook && !loadingSlots && slots.length > 0 && (
            <div className="flex flex-wrap gap-[6px] max-h-[160px] overflow-y-auto hide-scroll">
              {slots.map((s) => {
                const active = s.slot === selectedTime;
                return (
                  <button
                    key={s.slot}
                    onClick={() => setSelectedTime(s.slot)}
                    className="press-fx font-mono text-[13px] font-medium px-[10px] py-[6px] rounded-[8px]"
                    style={{
                      background: active ? "var(--ink-1)" : "var(--surface)",
                      color: active ? "var(--bg)" : "var(--ink-1)",
                      border: `1px solid ${active ? "var(--ink-1)" : "var(--line)"}`,
                      fontFamily: "inherit",
                      cursor: "pointer",
                    }}
                    type="button"
                  >
                    {s.slot}
                  </button>
                );
              })}
            </div>
          )}

          {/* Toggle sobre-turno */}
          <label
            className="flex items-center gap-[8px] mt-[10px] cursor-pointer select-none"
            style={{ fontFamily: "inherit" }}
          >
            <input
              type="checkbox"
              checked={isOverbook}
              onChange={(e) => setIsOverbook(e.target.checked)}
              className="cursor-pointer"
            />
            <span className="text-[12px] text-ink-2">
              Sobre-turno (forzar hora fuera del horario normal)
            </span>
          </label>
        </div>

        {/* Precio (opcional) */}
        <div>
          <div className="flex justify-between items-baseline mb-[6px]">
            <label className="text-[12px] font-medium text-ink-2">Precio cobrado</label>
            <span className="label-mono">Opcional</span>
          </div>
          <input
            type="number"
            inputMode="decimal"
            value={priceOverride}
            onChange={(e) => setPriceOverride(e.target.value)}
            placeholder={
              selectedService?.price != null
                ? `Default: ${selectedService.price}`
                : "Sin precio fijado"
            }
            className="w-full h-[40px] px-[12px] border border-line bg-surface rounded-sm text-[14px] text-ink-1 outline-none focus-visible:outline-[2px] focus-visible:outline-accent font-mono"
            style={{ fontFamily: "inherit" }}
          />
          <p className="text-[10.5px] text-ink-3 mt-[4px] leading-[1.3]">
            Dejá vacío para usar el precio del servicio. Útil para descuentos puntuales o cobros distintos.
          </p>
        </div>

        {/* Recurso */}
        <div>
          <label className="text-[12px] font-medium text-ink-2 block mb-[6px]">Profesional</label>
          <select
            value={selectedResource}
            onChange={(e) => setSelectedResource(e.target.value)}
            className="w-full h-[44px] px-[12px] border border-line bg-surface rounded-sm text-[14px] text-ink-1 outline-none"
            style={{ fontFamily: "inherit" }}
          >
            <option value="">Auto-asignar</option>
            {resources.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>

        {/* Teléfono */}
        <div>
          <label className="text-[12px] font-medium text-ink-2 block mb-[6px]">Teléfono del cliente</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Ej: +54 9 11 5555 2200 / 11 5555 2200"
            inputMode="tel"
            className="w-full h-[44px] px-[12px] border border-line bg-surface rounded-sm text-[14px] text-ink-1 outline-none focus-visible:outline-[2px] focus-visible:outline-accent"
            style={{ fontFamily: "inherit" }}
          />
          <p className="text-[10.5px] text-ink-3 mt-[4px] leading-[1.3]">
            Aceptamos cualquier formato (con o sin código de país, con o sin espacios).
            Si el cliente ya existe con email cargado, le llega el mail automáticamente.
          </p>
        </div>

        {/* Nombre */}
        <div>
          <div className="flex justify-between items-baseline mb-[6px]">
            <label className="text-[12px] font-medium text-ink-2">Nombre</label>
            <span className="label-mono">Opcional</span>
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del cliente"
            className="w-full h-[44px] px-[12px] border border-line bg-surface rounded-sm text-[14px] text-ink-1 outline-none focus-visible:outline-[2px] focus-visible:outline-accent"
            style={{ fontFamily: "inherit" }}
          />
        </div>

        <Btn onClick={handleCreate} disabled={!canSubmit} loading={loading} size="lg" full className="mt-[8px]">
          Crear turno
        </Btn>
      </div>
    </BottomSheet>
  );
}

// ─── Main: AgendaView ──────────────────────────────────────
export function AgendaView({ resources, services, tenantId, tenantName, timezone }: {
  resources: Resource[];
  services: Service[];
  tenantId: string;
  tenantName: string;
  timezone: string;
}) {
  const { selectedDate, viewMode, resourceFilter, setDate, shiftDate, setViewMode, setResourceFilter } = useAdminStore();
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createTime, setCreateTime] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  // Banner que aparece después de confirmar desde notificación push (iOS tap)
  const [pushToast, setPushToast] = useState<{ waUrl?: string } | null>(null);

  // Push notifications
  const { isSubscribed, requestPermission } = usePushNotifications(tenantId);
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Auto-confirmar cuando la notificación push de iOS navega a ?confirm=ID&wa=URL
  const confirmIdOnMount = useRef(searchParams.get("confirm"));
  const waUrlOnMount = useRef(searchParams.get("wa") ?? undefined);
  useEffect(() => {
    const confirmId = confirmIdOnMount.current;
    if (!confirmId) return;
    router.replace("/admin/agenda");
    api.patch(`/appointments/${confirmId}/confirm`, {})
      .then(() => {
        qc.invalidateQueries({ queryKey: ["appointments", tenantId] });
        setPushToast({ waUrl: waUrlOnMount.current });
        setTimeout(() => setPushToast(null), 8000);
      })
      .catch(() => {
        setActionSuccess("Error al confirmar el turno");
        setTimeout(() => setActionSuccess(null), 3000);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // "Hoy" según la zona horaria del NEGOCIO (no la del navegador de quien mira),
  // igual que el backend. Así a las 23hs en Argentina la agenda sigue mostrando
  // el día correcto en vez de saltar a mañana (UTC).
  const today = todayInTimezone(timezone);
  const isToday = selectedDate === today;

  // Al montar, abrir la agenda en "hoy" del negocio. selectedDate no se persiste
  // (solo viewMode), así que esto define el día inicial en cada carga y corrige
  // el default del store si el navegador está en otra zona (dueño de viaje).
  const didInitDate = useRef(false);
  useEffect(() => {
    if (didInitDate.current) return;
    didInitDate.current = true;
    if (selectedDate !== today) setDate(today);
  }, [today, selectedDate, setDate]);

  // Memoizado: si no, weekDates es nuevo array en cada render → loop infinito
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  // Fetch reactivo con TanStack Query:
  //  - polling cada 30s para detectar turnos creados desde la web pública
  //  - refetch automático al volver al tab (refetchOnWindowFocus en QueryClient)
  //  - invalidación manual después de confirm/cancel/create
  const apptsQueryKey = useMemo(
    () => [
      "appointments",
      tenantId,
      viewMode,
      viewMode === "day" ? selectedDate : `${weekDates[0]}_${weekDates[6]}`,
      resourceFilter,
    ] as const,
    [tenantId, viewMode, selectedDate, weekDates, resourceFilter],
  );

  const { data: appointments = [], isLoading: loadingAppts } = useQuery({
    queryKey: apptsQueryKey,
    enabled: !!tenantId,
    queryFn: async () => {
      const params = new URLSearchParams({ tenantId });
      if (viewMode === "day") {
        params.set("date", selectedDate);
      } else {
        params.set("startDate", weekDates[0]);
        params.set("endDate", weekDates[6]);
      }
      if (resourceFilter !== "all") {
        params.set("resourceId", resourceFilter);
      }
      return api.get<Appointment[]>(`/appointments?${params.toString()}`);
    },
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  const { data: blockedSlots = [] } = useQuery({
    queryKey: ["blocked-slots", tenantId],
    enabled: !!tenantId,
    queryFn: () => api.get<BlockedSlot[]>(`/blocked-slots?tenantId=${tenantId}`),
    // No hace falta polling fino: los bloqueos los crea el mismo admin.
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });

  const blockedDates = useMemo(
    () => expandFullDayBlocks(blockedSlots),
    [blockedSlots],
  );

  const invalidateAppointments = () =>
    qc.invalidateQueries({ queryKey: ["appointments", tenantId] });

  // En modo día, los appointments ya vienen filtrados por fecha desde el backend
  // En modo semana, necesitamos los del día seleccionado para los stats
  const dayAppointments = appointments
    .filter((a) => a.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  const counts = {
    total: dayAppointments.length,
    confirmed: dayAppointments.filter((a) => a.status === "confirmed").length,
    pending: dayAppointments.filter((a) => a.status === "pending").length,
  };

  const nextAppt = isToday
    ? dayAppointments.find((a) => a.status !== "cancelled" && a.time >= nowTimeInTimezone(timezone))
    : null;

  // Actions
  const handleConfirm = async () => {
    if (!selectedAppt) return;
    setActionLoading(true);
    try {
      await api.patch<Appointment>(`/appointments/${selectedAppt.id}/confirm`, {});
      setActionSuccess("Turno confirmado");
      await invalidateAppointments();
      setSelectedAppt(null);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch {
      setActionSuccess("Error al confirmar");
      setTimeout(() => setActionSuccess(null), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (alsoBlockSlot: boolean) => {
    if (!selectedAppt) return;
    setActionLoading(true);
    try {
      await api.patch<Appointment>(`/appointments/${selectedAppt.id}/cancel`, {});

      if (alsoBlockSlot) {
        // Bloquear el horario para que nadie más pueda reservarlo.
        // Best-effort: si falla, no rompe la cancelación que ya pasó.
        try {
          await api.post("/blocked-slots", {
            tenant_id: selectedAppt.tenant_id,
            resource_id: selectedAppt.resource_id,
            date: selectedAppt.date,
            start_time: selectedAppt.time,
            end_time: selectedAppt.end_time,
            reason: `Cancelación: ${selectedAppt.client?.name ?? "Cliente"}`,
          });
        } catch (e) {
          console.error("No se pudo bloquear el slot:", e);
        }
      }

      setActionSuccess(alsoBlockSlot ? "Turno cancelado y horario bloqueado" : "Turno cancelado");
      await invalidateAppointments();
      if (alsoBlockSlot) {
        await qc.invalidateQueries({ queryKey: ["blocked-slots", tenantId] });
      }
      setSelectedAppt(null);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch {
      setActionSuccess("Error al cancelar");
      setTimeout(() => setActionSuccess(null), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleNotesChange = async (notes: string) => {
    if (!selectedAppt) return;
    try {
      await api.patch(`/appointments/${selectedAppt.id}`, { notes });
    } catch { /* silently */ }
  };

  const handlePriceChange = async (price: number | null) => {
    if (!selectedAppt) return;
    try {
      await api.patch(`/appointments/${selectedAppt.id}`, {
        price_override: price,
      });
      await invalidateAppointments();
    } catch { /* silently */ }
  };

  const openCreate = (time: string | null) => {
    setCreateTime(time);
    setCreateOpen(true);
  };

  return (
    <>
      <AdminHeader
        title={formatDateLabel(selectedDate, today)}
        subtitle={tenantName}
        tenantId={tenantId}
        onEnablePushNotifications={requestPermission}
        isPushEnabled={isSubscribed}
      />

      {/* Date nav + view toggle */}
      <div className="px-[20px] pb-[10px] flex items-center gap-[8px] flex-shrink-0">
        <button
          onClick={() => shiftDate(-1)}
          className="press-fx w-[36px] h-[36px] rounded-[10px] bg-surface border border-line flex items-center justify-center"
        >
          <Icon name="back" size={14} color="var(--ink-2)" />
        </button>
        <button
          onClick={() => setDate(today)}
          className="press-fx h-[36px] px-[14px] rounded-[10px] text-[13px] font-medium"
          style={{
            background: isToday ? "var(--ink-1)" : "var(--surface)",
            color: isToday ? "var(--bg)" : "var(--ink-1)",
            border: `1px solid ${isToday ? "var(--ink-1)" : "var(--line)"}`,
            fontFamily: "inherit",
          }}
        >
          Hoy
        </button>
        <button
          onClick={() => shiftDate(1)}
          className="press-fx w-[36px] h-[36px] rounded-[10px] bg-surface border border-line flex items-center justify-center"
        >
          <Icon name="forward" size={14} color="var(--ink-2)" />
        </button>
        <div className="flex-1" />
        <div className="flex bg-line-2 rounded-[10px] p-[2px]">
          {(["day", "week"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className="px-[12px] py-[6px] text-[12px] font-medium rounded-[8px] text-ink-1"
              style={{
                background: viewMode === m ? "var(--surface)" : "transparent",
                boxShadow: viewMode === m ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                fontFamily: "inherit",
                border: 0,
                cursor: "pointer",
              }}
            >
              {m === "day" ? "Día" : "Semana"}
            </button>
          ))}
        </div>
      </div>

      {/* Stats + próximo (solo día) */}
      {viewMode === "day" && (
        <div className="px-[20px] pb-[12px] flex-shrink-0 flex flex-col gap-[8px]">
          <div className="bg-surface border border-line rounded px-[16px] py-[14px] flex items-center gap-[16px]">
            <Stat value={counts.total} label="Total" />
            <div className="w-[1px] self-stretch bg-line-2" />
            <Stat value={counts.confirmed} label="Confirmados" color="var(--status-confirmed)" />
            <div className="w-[1px] self-stretch bg-line-2" />
            <Stat value={counts.pending} label="Pendientes" color="var(--status-pending)" />
          </div>
          {nextAppt && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-[10px] px-[14px] py-[10px] bg-ink-1 text-bg rounded text-[12px]"
            >
              <span className="w-[6px] h-[6px] rounded-full bg-accent animate-pulse-dot flex-shrink-0" />
              <span className="flex-1">
                Próximo · <span className="font-mono">{nextAppt.time}</span> {nextAppt.client?.name}
              </span>
            </motion.div>
          )}
        </div>
      )}

      {/* Resource filter chips */}
      {viewMode === "day" && (
        <div className="px-[20px] pb-[8px] flex gap-[6px] overflow-x-auto hide-scroll flex-shrink-0">
          <ResourceChip active={resourceFilter === "all"} onClick={() => setResourceFilter("all")}>
            Todos
          </ResourceChip>
          {resources.map((r) => (
            <ResourceChip key={r.id} active={resourceFilter === r.id} onClick={() => setResourceFilter(r.id)}>
              <span className="inline-flex items-center gap-[6px]">
                <ResourceAvatar
                  initials={r.name.slice(0, 2).toUpperCase()}
                  hue={(r as Resource & { hue?: number }).hue ?? 24}
                  size={16}
                />
                {r.name.split(" ")[0]}
              </span>
            </ResourceChip>
          ))}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto hide-scroll px-[20px] pb-[100px]" style={{ paddingTop: 8 }}>
        {loadingAppts ? (
          <div className="flex flex-col gap-[8px]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-[70px] rounded-[10px] bg-line-2 animate-pulse" />
            ))}
          </div>
        ) : viewMode === "day" ? (
          <DayView
            appointments={dayAppointments}
            resources={resources}
            onOpen={setSelectedAppt}
            onCreateAt={openCreate}
            timezone={timezone}
            showNow={isToday}
          />
        ) : (
          <WeekView
            weekDates={weekDates}
            appointments={appointments}
            blockedDates={blockedDates}
            onDayClick={(date) => { setDate(date); setViewMode("day"); }}
            today={today}
          />
        )}
      </div>

      {/* FAB */}
      <FAB onClick={() => openCreate(null)} />

      {/* Detail sheet */}
      <ApptDetailSheet
        appt={selectedAppt}
        resources={resources}
        onClose={() => setSelectedAppt(null)}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        onNotesChange={handleNotesChange}
        onPriceChange={handlePriceChange}
        loading={actionLoading}
      />

      {/* Create sheet */}
      <CreateApptSheet
        open={createOpen}
        onClose={() => { setCreateOpen(false); void invalidateAppointments(); }}
        initialTime={createTime}
        services={services}
        resources={resources}
        tenantId={tenantId}
      />

      {/* Toast de confirmación por tap de notificación push (iOS) */}
      {pushToast && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          className="fixed bottom-[24px] left-[16px] right-[16px] z-50 rounded-[12px] px-[16px] py-[14px] flex items-center gap-[12px]"
          style={{ background: "var(--ink-1)", color: "var(--bg)" }}
        >
          <Icon name="check" size={18} color="var(--bg)" />
          <span className="flex-1 text-[13px] font-medium">Turno confirmado</span>
          {pushToast.waUrl && (
            <a
              href={pushToast.waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] font-semibold underline"
              style={{ color: "var(--bg)" }}
            >
              WhatsApp
            </a>
          )}
          <button onClick={() => setPushToast(null)} style={{ opacity: 0.6, background: "none", border: 0, cursor: "pointer", color: "var(--bg)" }}>✕</button>
        </motion.div>
      )}
    </>
  );
}

// ─── Helpers UI ────────────────────────────────────────────
function Stat({ value, label, color = "var(--ink-1)" }: { value: number; label: string; color?: string }) {
  return (
    <div>
      <div className="text-[22px] font-semibold leading-[1]" style={{ color, letterSpacing: "-0.5px" }}>{value}</div>
      <div className="label-mono mt-[3px]">{label}</div>
    </div>
  );
}

function ResourceChip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="press-fx flex-shrink-0 px-[14px] py-[8px] rounded-full text-[13px] font-medium"
      style={{
        background: active ? "var(--ink-1)" : "var(--surface)",
        color: active ? "var(--bg)" : "var(--ink-1)",
        border: `1px solid ${active ? "var(--ink-1)" : "var(--line)"}`,
        fontFamily: "inherit",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
