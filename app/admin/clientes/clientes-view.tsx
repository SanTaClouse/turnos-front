"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Client, Appointment } from "@/types/api";
import { AdminHeader } from "@/components/admin/admin-header";
import { BottomSheet } from "@/components/admin/bottom-sheet";
import { Btn } from "@/components/ui/btn";
import { Icon } from "@/components/ui/icon";

// ─── Helpers ───────────────────────────────────────────────
function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function formatShortDate(dateStr: string): string {
  const [, m, d] = dateStr.split("-").map(Number);
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${d} ${months[m - 1]}`;
}

function formatNextLabel(dateStr: string, time: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return `Hoy · ${time}`;
  if (dateStr === tomorrow) return `Mañana · ${time}`;
  return `${formatShortDate(dateStr)} · ${time}`;
}

interface EnrichedClient extends Client {
  visits: number;
  lastVisitDate: string | null;
  nextAppt: { date: string; time: string } | null;
  tags: ("vip" | "nuevo" | "inactivo")[];
}

function enrichClients(clients: Client[], appointments: Appointment[]): EnrichedClient[] {
  const today = new Date().toISOString().slice(0, 10);
  const nowTime = new Date().toTimeString().slice(0, 5);

  return clients.map((c) => {
    const myAppts = appointments.filter((a) => a.client_id === c.id && a.status !== "cancelled");
    const past = myAppts.filter((a) => a.date < today || (a.date === today && a.time < nowTime));
    const future = myAppts
      .filter((a) => a.date > today || (a.date === today && a.time >= nowTime))
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

    const visits = past.length;
    const lastVisitDate = past.length
      ? past.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))[0].date
      : null;
    const nextAppt = future.length ? { date: future[0].date, time: future[0].time } : null;

    const tags: ("vip" | "nuevo" | "inactivo")[] = [];
    if (visits >= 5) tags.push("vip");
    if (visits === 0 || visits === 1) tags.push("nuevo");
    if (visits >= 3 && !nextAppt) tags.push("inactivo");

    return { ...c, visits, lastVisitDate, nextAppt, tags };
  });
}

// ─── Tag pill ──────────────────────────────────────────────
function TagPill({ tag }: { tag: "vip" | "nuevo" | "inactivo" }) {
  const styles: Record<typeof tag, { bg: string; color: string; label: string }> = {
    vip:      { bg: "#f9eecb", color: "#8a6a1a", label: "VIP" },
    nuevo:    { bg: "var(--status-confirmed-bg)", color: "var(--status-confirmed)", label: "NUEVO" },
    inactivo: { bg: "var(--line-2)", color: "var(--ink-3)", label: "INACTIVO" },
  };
  const s = styles[tag];
  return (
    <span
      className="font-mono text-[8px] font-semibold tracking-[0.05em] px-[5px] py-[2px] rounded-[4px]"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

// ─── Stat card ─────────────────────────────────────────────
function StatCard({ value, label, accent = false }: { value: string | number; label: string; accent?: boolean }) {
  return (
    <div
      className="flex-1 px-[12px] py-[12px] rounded-sm"
      style={{
        background: accent ? "var(--ink-1)" : "var(--surface)",
        color: accent ? "var(--bg)" : "var(--ink-1)",
        border: `1px solid ${accent ? "var(--ink-1)" : "var(--line)"}`,
      }}
    >
      <div className="font-serif text-[24px] leading-[1]" style={{ letterSpacing: "-0.5px" }}>{value}</div>
      <div className="font-mono text-[9px] uppercase tracking-[0.1em] mt-[4px]" style={{ opacity: 0.7 }}>
        {label}
      </div>
    </div>
  );
}

// ─── Detail sheet ──────────────────────────────────────────
function ClientDetail({ client, appointments, onClose }: {
  client: EnrichedClient;
  appointments: Appointment[];
  onClose: () => void;
}) {
  const [notes, setNotes] = useState(""); // note: Client no tiene notes en backend aún
  const myAppts = appointments
    .filter((a) => a.client_id === client.id)
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  const initials = getInitials(client.name);
  const waLink = `https://wa.me/${client.phone.replace(/\D/g, "")}`;

  return (
    <BottomSheet open onClose={onClose} title="Cliente">
      {/* Avatar + name + WhatsApp */}
      <div className="flex items-center gap-[14px] mb-[18px]">
        <div className="w-[56px] h-[56px] rounded-full bg-line-2 flex items-center justify-center text-[18px] font-semibold text-ink-1">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-serif text-[22px] truncate" style={{ letterSpacing: "-0.3px" }}>
            {client.name}
          </div>
          <div className="font-mono text-[12px] text-ink-2 mt-[2px]">{client.phone}</div>
        </div>
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="press-fx w-[42px] h-[42px] rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "#25D366" }}
          aria-label="WhatsApp"
        >
          <Icon name="whatsapp" size={19} color="white" />
        </a>
      </div>

      {/* Tags */}
      {client.tags.length > 0 && (
        <div className="flex gap-[6px] mb-[14px]">
          {client.tags.map((t) => <TagPill key={t} tag={t} />)}
        </div>
      )}

      {/* Stats */}
      <div className="flex gap-[8px] mb-[18px]">
        <StatCard value={client.visits} label="Visitas" />
        <StatCard
          value={client.lastVisitDate ? formatShortDate(client.lastVisitDate) : "—"}
          label="Última"
        />
        <StatCard
          value={client.nextAppt ? "1" : "0"}
          label="Próximos"
          accent={!!client.nextAppt}
        />
      </div>

      {/* Notas (placeholder hasta que el backend tenga el campo) */}
      <div className="label-mono mb-[8px]">Notas</div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Preferencias, alergias, observaciones..."
        rows={2}
        className="w-full px-[12px] py-[10px] border border-line bg-surface rounded-sm text-[13px] text-ink-1 leading-[1.4] resize-none outline-none focus-visible:outline-[2px] focus-visible:outline-accent"
        style={{ fontFamily: "inherit" }}
      />
      <p className="text-[10px] text-ink-3 mt-[4px]">Próximamente: las notas se guardarán automáticamente.</p>

      {/* Historial */}
      <div className="label-mono mt-[16px] mb-[8px]">Historial</div>
      {myAppts.length === 0 ? (
        <p className="text-[12px] text-ink-3 px-[14px] py-[12px] bg-surface border border-line rounded">
          Aún no tiene turnos.
        </p>
      ) : (
        <div className="bg-surface border border-line rounded overflow-hidden">
          {myAppts.map((a, i) => (
            <div
              key={a.id}
              className="flex items-center gap-[12px] px-[14px] py-[12px]"
              style={{ borderBottom: i < myAppts.length - 1 ? "1px solid var(--line-2)" : "none" }}
            >
              <span className="font-mono text-[11px] text-ink-3" style={{ width: 44 }}>
                {formatShortDate(a.date)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate">{a.service?.name ?? "Turno"}</div>
                <div className="text-[11px] text-ink-3 mt-[1px]">
                  {a.resource?.name ? `con ${a.resource.name}` : ""}
                  {a.status === "cancelled" && (
                    <span className="ml-[6px] text-danger">cancelado</span>
                  )}
                  {a.status === "pending" && (
                    <span className="ml-[6px] text-status-pending">pendiente</span>
                  )}
                </div>
              </div>
              <span className="font-mono text-[11px] text-ink-2">{a.time}</span>
            </div>
          ))}
        </div>
      )}

      {/* Acción */}
      <Btn size="lg" full className="mt-[18px] gap-2">
        <Icon name="plus" size={15} color="var(--bg)" /> Agendar turno
      </Btn>
    </BottomSheet>
  );
}

// ─── Main view ─────────────────────────────────────────────
export function ClientesView({
  initialClients,
  appointments: initialAppointments,
  tenantId,
}: {
  initialClients: Client[];
  appointments: Appointment[];
  tenantId: string;
}) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  const [appointments, setAppointments] = useState(initialAppointments);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "vip" | "nuevo" | "inactivo">("all");
  const [selected, setSelected] = useState<EnrichedClient | null>(null);

  useEffect(() => { setClients(initialClients); }, [initialClients]);
  useEffect(() => { setAppointments(initialAppointments); }, [initialAppointments]);

  // Refrescar al volver al sheet
  const handleClose = async () => {
    setSelected(null);
    try {
      const [c, a] = await Promise.all([
        api.get<Client[]>(`/clients?tenantId=${tenantId}`),
        api.get<Appointment[]>(`/appointments?tenantId=${tenantId}`),
      ]);
      setClients(c);
      setAppointments(a);
      router.refresh();
    } catch { /* silently */ }
  };

  const enriched = useMemo(
    () => enrichClients(clients, appointments),
    [clients, appointments],
  );

  const filtered = useMemo(() => {
    let list = enriched;
    if (filter !== "all") list = list.filter((c) => c.tags.includes(filter));
    if (query) {
      const q = query.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.replace(/\s/g, "").includes(q.replace(/\s/g, "")),
      );
    }
    return list.sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
  }, [enriched, query, filter]);

  // Agrupar por primera letra
  const grouped = useMemo(() => {
    const map: Record<string, EnrichedClient[]> = {};
    filtered.forEach((c) => {
      const letter = c.name[0].toUpperCase();
      if (!map[letter]) map[letter] = [];
      map[letter].push(c);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <>
      <AdminHeader title="Clientes" subtitle={`${enriched.length} ${enriched.length === 1 ? "total" : "totales"}`} />

      {/* Búsqueda */}
      <div className="px-[20px] pb-[8px] flex-shrink-0">
        <div className="relative">
          <span className="absolute left-[14px] top-1/2 -translate-y-1/2">
            <Icon name="search" size={15} color="var(--ink-3)" />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o teléfono..."
            className="w-full h-[42px] pl-[38px] pr-[12px] border border-line bg-surface rounded-sm text-[13px] text-ink-1 outline-none focus-visible:outline-[2px] focus-visible:outline-accent"
            style={{ fontFamily: "inherit" }}
          />
        </div>
      </div>

      {/* Filtros */}
      <div className="px-[20px] pb-[8px] flex gap-[6px] overflow-x-auto hide-scroll flex-shrink-0">
        {(["all", "vip", "nuevo", "inactivo"] as const).map((f) => {
          const labels: Record<typeof f, string> = {
            all: "Todos",
            vip: "VIP",
            nuevo: "Nuevos",
            inactivo: "Inactivos",
          };
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="press-fx flex-shrink-0 px-[14px] py-[7px] rounded-full text-[12px] font-medium"
              style={{
                background: active ? "var(--ink-1)" : "var(--surface)",
                color: active ? "var(--bg)" : "var(--ink-1)",
                border: `1px solid ${active ? "var(--ink-1)" : "var(--line)"}`,
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              {labels[f]}
            </button>
          );
        })}
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto hide-scroll px-[20px] pt-[6px] pb-[100px]">
        {filtered.length === 0 ? (
          <div className="text-center py-[40px]">
            <div className="w-[56px] h-[56px] rounded-[16px] bg-line-2 inline-flex items-center justify-center">
              <Icon name="user" size={24} color="var(--ink-3)" />
            </div>
            <div className="font-serif text-[22px] mt-[18px]" style={{ letterSpacing: "-0.3px", lineHeight: 1.15 }}>
              {clients.length === 0 ? "Sin clientes aún" : "Sin resultados"}
            </div>
            <p className="text-[13px] text-ink-2 mt-[8px] leading-[1.5]" style={{ maxWidth: 280, margin: "8px auto 0" }}>
              {clients.length === 0
                ? "Cuando reciban turnos, los clientes van a aparecer acá."
                : "Probá con otra búsqueda."}
            </p>
          </div>
        ) : (
          grouped.map(([letter, list]) => (
            <div key={letter} className="mb-[10px]">
              <div
                className="label-mono px-[4px] py-[8px] sticky top-0 bg-bg z-10"
                style={{ paddingBottom: 6 }}
              >
                {letter}
              </div>
              <div className="flex flex-col gap-[4px]">
                {list.map((c) => {
                  const initials = getInitials(c.name);
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelected(c)}
                      className="press-fx flex items-center gap-[12px] px-[12px] py-[10px] rounded-[10px] bg-surface border border-line text-left"
                      style={{ fontFamily: "inherit", cursor: "pointer" }}
                    >
                      <div className="w-[36px] h-[36px] rounded-full bg-line-2 flex items-center justify-center text-[13px] font-semibold text-ink-1 flex-shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium flex items-center gap-[6px]" style={{ letterSpacing: "-0.2px" }}>
                          <span className="truncate">{c.name}</span>
                          {c.tags.includes("vip") && <TagPill tag="vip" />}
                          {c.tags.includes("nuevo") && <TagPill tag="nuevo" />}
                        </div>
                        <div className="text-[11px] text-ink-3 mt-[2px] flex gap-[8px]">
                          <span className="font-mono">{c.phone}</span>
                          <span>·</span>
                          <span>{c.visits} {c.visits === 1 ? "visita" : "visitas"}</span>
                        </div>
                      </div>
                      {c.nextAppt && (
                        <div className="text-right flex-shrink-0">
                          <div className="font-mono text-[9px] text-ink-3 uppercase tracking-[0.05em]">Próximo</div>
                          <div className="font-mono text-[11px] text-ink-1 font-medium mt-[2px]">
                            {formatNextLabel(c.nextAppt.date, c.nextAppt.time)}
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {selected && (
        <ClientDetail
          client={selected}
          appointments={appointments}
          onClose={handleClose}
        />
      )}
    </>
  );
}
