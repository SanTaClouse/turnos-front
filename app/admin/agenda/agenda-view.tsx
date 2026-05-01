"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { usePushNotifications } from "@/lib/use-push-notifications";
import type { Appointment, Resource, Service } from "@/types/api";
import { useAdminStore } from "@/store/admin";
import { AdminHeader } from "@/components/admin/admin-header";
import { BottomSheet } from "@/components/admin/bottom-sheet";
import { FAB } from "@/components/admin/fab";
import { ResourceAvatar } from "@/components/ui/resource-avatar";
import { StatusPill, SourcePill } from "@/components/ui/status-pill";
import { Btn } from "@/components/ui/btn";
import { Icon } from "@/components/ui/icon";

// ─── Helpers ───────────────────────────────────────────────
function formatDateLabel(dateStr: string) {
  const today = new Date().toISOString().slice(0, 10);
  if (dateStr === today) return "Hoy";
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  if (dateStr === tomorrow) return "Mañana";
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
  const date = new Date(y, m - 1, d);
  const dow = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((dow + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    return dd.toISOString().slice(0, 10);
  });
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

function DayView({ appointments, resources, onOpen, onCreateAt }: {
  appointments: Appointment[];
  resources: Resource[];
  onOpen: (a: Appointment) => void;
  onCreateAt: (time: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const firstApptRef = useRef<HTMLButtonElement>(null);
  const totalHeight = TOTAL_MINS * PX_PER_MIN;

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

          return (
            <button
              ref={isFirst ? firstApptRef : null}
              key={appt.id}
              onClick={() => onOpen(appt)}
              className="press-fx absolute left-0 right-0 bg-surface rounded-[8px] px-[10px] py-[6px] flex items-start gap-[8px] text-left overflow-hidden"
              style={{
                top: startMins * PX_PER_MIN,
                height,
                border: "1px solid var(--line)",
                borderLeft: `3px solid ${statusBorder}`,
                fontFamily: "inherit",
                zIndex: 10,
              }}
            >
              {resource && (
                <ResourceAvatar
                  initials={resource.name.slice(0, 2).toUpperCase()}
                  hue={(resource as Resource & { hue?: number }).hue ?? 24}
                  size={height > 50 ? 28 : 20}
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-[4px]">
                  <span className="font-mono text-[11px] font-semibold text-ink-1">{appt.time}</span>
                  <span className="text-[10px] text-ink-3">· {duration}min</span>
                </div>
                {height > 44 && (
                  <div className="text-[12px] font-medium text-ink-1 truncate mt-[1px]">
                    {appt.client?.name ?? "Cliente"}
                  </div>
                )}
                {height > 62 && (
                  <div className="text-[10px] text-ink-3 truncate">{appt.service?.name}</div>
                )}
              </div>
              {height > 50 && (
                <StatusPill status={appt.status as "pending" | "confirmed" | "cancelled"} />
              )}
            </button>
          );
        })}

        {/* Línea "ahora" */}
        <NowLine />
      </div>
    </div>
  );
}

function NowLine() {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes() - START_HOUR * 60;
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
function WeekView({ weekDates, appointments, onDayClick }: {
  weekDates: string[];
  appointments: Appointment[];
  onDayClick: (date: string) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
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
        const count = countByDate[date] ?? 0;
        const [, , d] = date.split("-").map(Number);
        return (
          <button
            key={date}
            onClick={() => onDayClick(date)}
            className="press-fx flex items-center gap-[14px] px-[16px] py-[14px] rounded text-left w-full"
            style={{
              background: isToday ? "var(--ink-1)" : "var(--surface)",
              color: isToday ? "var(--bg)" : "var(--ink-1)",
              border: `1px solid ${isToday ? "var(--ink-1)" : "var(--line)"}`,
              fontFamily: "inherit",
            }}
          >
            <div style={{ width: 44 }}>
              <div className="font-mono text-[10px] uppercase tracking-[0.05em]" style={{ opacity: 0.7 }}>{dayNames[i]}</div>
              <div className="font-serif text-[26px] leading-[1] mt-[2px]" style={{ letterSpacing: "-0.5px" }}>{d}</div>
            </div>
            <div className="flex-1">
              {count === 0 ? (
                <div className="text-[13px] opacity-50">Cerrado</div>
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
function ApptDetailSheet({ appt, resources, onClose, onConfirm, onCancel, onNotesChange, loading }: {
  appt: Appointment | null;
  resources: Resource[];
  onClose: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  onNotesChange: (notes: string) => void;
  loading?: boolean;
}) {
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

  return (
    <BottomSheet open={!!appt} onClose={onClose} title="Detalle del turno">
      {appt && (
        <div>
          {/* Status + source + code */}
          <div className="flex items-center gap-[10px] mb-[16px] flex-wrap">
            <StatusPill status={appt.status as "pending" | "confirmed" | "cancelled"} />
            <SourcePill source={appt.source as "whatsapp" | "web" | "manual"} />
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
            {appt.status === "pending" && (
              <Btn onClick={onConfirm} loading={loading} disabled={loading} size="lg" full className="gap-2">
                {!loading && <><Icon name="check" size={16} color="var(--bg)" /> Confirmar turno</>}
                {loading && "Confirmando..."}
              </Btn>
            )}
            {appt.status !== "cancelled" && (
              <Btn variant="secondary" size="lg" full onClick={onCancel} loading={loading} disabled={loading} className="text-danger">
                {!loading ? "Cancelar turno" : "Cancelando..."}
              </Btn>
            )}
          </div>
        </div>
      )}
    </BottomSheet>
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
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { selectedDate } = useAdminStore();

  useEffect(() => {
    if (!open) { setSelectedService(null); setPhone(""); setName(""); setSelectedResource(""); }
  }, [open]);

  const canSubmit = !!selectedService && phone.replace(/\D/g, "").length >= 8;

  const handleCreate = async () => {
    if (!canSubmit || !initialTime) return;
    setLoading(true);
    try {
      await api.post("/appointments", {
        tenant_id: tenantId,
        service_id: selectedService!.id,
        resource_id: selectedResource || undefined,
        date: selectedDate,
        time: initialTime,
        client_phone: `+54${phone.replace(/\D/g, "")}`,
        client_name: name || "Cliente",
        source: "manual",
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
        {/* Fecha y hora */}
        <div className="bg-surface border border-line rounded px-[14px] py-[12px] flex items-center gap-[14px]">
          <div className="flex-1">
            <div className="label-mono">Fecha y hora</div>
            <div className="text-[14px] font-medium mt-[2px]">
              {formatDate(selectedDate)} · <span className="font-mono">{initialTime ?? "—"}</span>
            </div>
          </div>
        </div>

        {/* Servicio */}
        <div>
          <label className="text-[12px] font-medium text-ink-2 block mb-[6px]">Servicio</label>
          <div className="flex flex-col gap-[6px]">
            {services.slice(0, 4).map((s) => (
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
            placeholder="11 5555 2200"
            inputMode="tel"
            className="w-full h-[44px] px-[12px] border border-line bg-surface rounded-sm text-[14px] text-ink-1 outline-none focus-visible:outline-[2px] focus-visible:outline-accent"
            style={{ fontFamily: "inherit" }}
          />
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
export function AgendaView({ resources, services, tenantId, tenantName }: {
  resources: Resource[];
  services: Service[];
  tenantId: string;
  tenantName: string;
}) {
  const { selectedDate, viewMode, resourceFilter, setDate, shiftDate, setViewMode, setResourceFilter } = useAdminStore();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createTime, setCreateTime] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Push notifications
  const { isSubscribed, requestPermission } = usePushNotifications(tenantId);

  const today = new Date().toISOString().slice(0, 10);
  const isToday = selectedDate === today;

  // Memoizado: si no, weekDates es nuevo array en cada render → loop infinito
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  // Fetch appointments — query depende del modo de vista
  const loadAppointments = useCallback(async () => {
    if (!tenantId) return;
    setLoadingAppts(true);
    try {
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
      const data = await api.get<Appointment[]>(`/appointments?${params.toString()}`);
      setAppointments(data);
    } catch {
      setAppointments([]);
    } finally {
      setLoadingAppts(false);
    }
  }, [tenantId, viewMode, selectedDate, resourceFilter, weekDates]);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);

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
    ? dayAppointments.find((a) => a.status !== "cancelled" && a.time >= new Date().toTimeString().slice(0, 5))
    : null;

  // Actions
  const handleConfirm = async () => {
    if (!selectedAppt) return;
    setActionLoading(true);
    try {
      await api.patch<Appointment>(`/appointments/${selectedAppt.id}/confirm`, {});
      setActionSuccess("Turno confirmado");
      await loadAppointments();
      setSelectedAppt(null);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch {
      setActionSuccess("Error al confirmar");
      setTimeout(() => setActionSuccess(null), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedAppt) return;
    setActionLoading(true);
    try {
      await api.patch<Appointment>(`/appointments/${selectedAppt.id}/cancel`, {});
      setActionSuccess("Turno cancelado");
      await loadAppointments();
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

  const openCreate = (time: string | null) => {
    setCreateTime(time);
    setCreateOpen(true);
  };

  return (
    <>
      <AdminHeader
        title={formatDateLabel(selectedDate)}
        subtitle={tenantName}
        notifCount={counts.pending}
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
          />
        ) : (
          <WeekView
            weekDates={weekDates}
            appointments={appointments}
            onDayClick={(date) => { setDate(date); setViewMode("day"); }}
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
        loading={actionLoading}
      />

      {/* Create sheet */}
      <CreateApptSheet
        open={createOpen}
        onClose={() => { setCreateOpen(false); loadAppointments(); }}
        initialTime={createTime}
        services={services}
        resources={resources}
        tenantId={tenantId}
      />
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
