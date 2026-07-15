"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { todayInTimezone } from "@/lib/timezone-utils";
import type { BlockedSlot, Resource } from "@/types/api";
import { AdminHeader } from "@/components/admin/admin-header";
import { BottomSheet } from "@/components/admin/bottom-sheet";
import { FAB } from "@/components/admin/fab";
import { Btn } from "@/components/ui/btn";
import { Icon } from "@/components/ui/icon";

// ──────────── Helpers ────────────

const DOW_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTH_SHORT = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

function parseDate(iso: string): Date {
  return new Date(iso + "T00:00:00Z");
}

function fmtDayLine(b: BlockedSlot): string {
  const d = parseDate(b.date);
  const dow = DOW_SHORT[d.getUTCDay()];
  const day = d.getUTCDate();
  const month = MONTH_SHORT[d.getUTCMonth()];
  const isAllDay = !b.start_time || !b.end_time;
  if (b.end_date && b.end_date !== b.date) {
    const e = parseDate(b.end_date);
    return `${dow} ${day} ${month} → ${e.getUTCDate()} ${MONTH_SHORT[e.getUTCMonth()]} · Todo el día`;
  }
  if (isAllDay) {
    return `${dow} ${day} ${month} · Todo el día`;
  }
  return `${dow} ${day} ${month} · ${b.start_time} - ${b.end_time}`;
}

function isUpcoming(b: BlockedSlot, today: string): boolean {
  const end = b.end_date ?? b.date;
  return end >= today;
}

interface BloqueosViewProps {
  tenantId: string;
  timezone: string;
  initialBlocks: BlockedSlot[];
  resources: Resource[];
}

export function BloqueosView({
  tenantId,
  timezone,
  initialBlocks,
  resources,
}: BloqueosViewProps) {
  const [blocks, setBlocks] = useState<BlockedSlot[]>(initialBlocks);
  const [creating, setCreating] = useState(false);

  const upcoming = useMemo(() => {
    const today = todayInTimezone(timezone);
    return blocks
      .filter((b) => isUpcoming(b, today))
      .sort((a, b) => (a.date + (a.start_time ?? "")).localeCompare(b.date + (b.start_time ?? "")));
  }, [blocks, timezone]);

  const resourceById = useMemo(() => {
    const m = new Map<string, Resource>();
    for (const r of resources) m.set(r.id, r);
    return m;
  }, [resources]);

  const handleDelete = async (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    try {
      await api.delete(`/blocked-slots/${id}`);
    } catch {
      // Si falla, refetch para reconciliar
      const fresh = await api
        .get<BlockedSlot[]>(`/blocked-slots?tenantId=${tenantId}`)
        .catch(() => null);
      if (fresh) setBlocks(fresh);
    }
  };

  const handleCreated = (created: BlockedSlot) => {
    setBlocks((prev) => [...prev, created]);
    setCreating(false);
  };

  return (
    <>
      <AdminHeader
        title="Bloqueos"
        subtitle={`${upcoming.length} próximo${upcoming.length === 1 ? "" : "s"}`}
      />

      <div
        className="hide-scroll flex-1 overflow-y-auto px-[20px]"
        style={{ paddingBottom: 120 }}
      >
        {upcoming.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-[10px] pt-[4px]">
            {upcoming.map((b) => (
              <BlockCard
                key={b.id}
                block={b}
                resource={b.resource_id ? resourceById.get(b.resource_id) : undefined}
                onDelete={() => handleDelete(b.id)}
              />
            ))}
          </div>
        )}
      </div>

      <FAB onClick={() => setCreating(true)} />

      <CreateBlockSheet
        open={creating}
        onClose={() => setCreating(false)}
        tenantId={tenantId}
        resources={resources}
        onCreated={handleCreated}
      />
    </>
  );
}

// ──────────── Empty ────────────

function EmptyState() {
  return (
    <div
      style={{
        marginTop: 40,
        textAlign: "center",
        color: "var(--ink-3)",
        padding: "0 20px",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: "var(--line-2)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
        }}
      >
        <Icon name="lock" size={22} color="var(--ink-3)" />
      </div>
      <div
        className="font-serif"
        style={{ fontSize: 22, color: "var(--ink-1)", marginBottom: 6 }}
      >
        Sin bloqueos
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.5 }}>
        Bloqueá feriados, vacaciones o franjas en las que no atendés. Tu agenda los
        respeta automáticamente.
      </div>
    </div>
  );
}

// ──────────── Block card ────────────

function BlockCard({
  block,
  resource,
  onDelete,
}: {
  block: BlockedSlot;
  resource?: Resource;
  onDelete: () => void;
}) {
  const resourceLabel = resource ? resource.name : "Todos";
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: "#fdece7",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon name="lock" size={16} color="#c45a3c" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: "-0.2px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {block.reason || "Bloqueo"}
        </div>
        <div
          className="font-mono"
          style={{
            fontSize: 11,
            color: "var(--ink-3)",
            marginTop: 2,
            letterSpacing: "-0.05em",
          }}
        >
          {fmtDayLine(block)}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--ink-3)",
            marginTop: 2,
          }}
        >
          Recurso: {resourceLabel}
        </div>
      </div>
      <button
        onClick={onDelete}
        className="press-fx"
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "var(--line-2)",
          border: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          cursor: "pointer",
        }}
        aria-label="Eliminar bloqueo"
      >
        <Icon name="close" size={14} color="var(--ink-2)" />
      </button>
    </div>
  );
}

// ──────────── Create sheet ────────────

type Mode = "all_day" | "time_range";

function CreateBlockSheet({
  open,
  onClose,
  tenantId,
  resources,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  resources: Resource[];
  onCreated: (b: BlockedSlot) => void;
}) {
  const [reason, setReason] = useState("");
  const [mode, setMode] = useState<Mode>("all_day");
  const [date, setDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [resourceId, setResourceId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setReason("");
    setMode("all_day");
    setDate("");
    setEndDate("");
    setStartTime("09:00");
    setEndTime("18:00");
    setResourceId("");
    setError(null);
  };

  const close = () => {
    onClose();
    setTimeout(reset, 200);
  };

  const submit = async () => {
    setError(null);
    if (!date) {
      setError("Elegí la fecha del bloqueo");
      return;
    }
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        tenant_id: tenantId,
        date,
        reason: reason.trim() || undefined,
      };
      if (resourceId) body.resource_id = resourceId;
      if (endDate && endDate !== date) body.end_date = endDate;
      if (mode === "time_range") {
        body.start_time = startTime;
        body.end_time = endTime;
      }
      const created = await api.post<BlockedSlot>("/blocked-slots", body);
      onCreated(created);
      reset();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo crear el bloqueo");
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={close} title="Nuevo bloqueo">
      <div className="flex flex-col gap-[14px]">
        <Field label="Nombre">
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Feriado, vacaciones, curso..."
            className="press-fx"
            style={{
              width: "100%",
              padding: "11px 12px",
              border: "1px solid var(--line)",
              borderRadius: 10,
              fontSize: 14,
              fontFamily: "inherit",
              background: "var(--surface)",
              color: "var(--ink-1)",
            }}
          />
        </Field>

        <Field label="Tipo">
          <div
            style={{
              display: "flex",
              background: "var(--line-2)",
              borderRadius: 10,
              padding: 3,
            }}
          >
            {(
              [
                { id: "all_day" as const, label: "Todo el día" },
                { id: "time_range" as const, label: "Rango horario" },
              ]
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setMode(opt.id)}
                className="press-fx"
                style={{
                  flex: 1,
                  padding: "8px 0",
                  border: 0,
                  background:
                    mode === opt.id ? "var(--surface)" : "transparent",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 500,
                  fontFamily: "inherit",
                  color:
                    mode === opt.id ? "var(--ink-1)" : "var(--ink-2)",
                  cursor: "pointer",
                  boxShadow:
                    mode === opt.id
                      ? "0 1px 3px rgba(0,0,0,0.06)"
                      : "none",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Field>

        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Desde" className="flex-1">
            <DateInput value={date} onChange={setDate} />
          </Field>
          {mode === "all_day" && (
            <Field label="Hasta (opcional)" className="flex-1">
              <DateInput value={endDate} onChange={setEndDate} />
            </Field>
          )}
        </div>

        {mode === "time_range" && (
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Inicio" className="flex-1">
              <TimeInput value={startTime} onChange={setStartTime} />
            </Field>
            <Field label="Fin" className="flex-1">
              <TimeInput value={endTime} onChange={setEndTime} />
            </Field>
          </div>
        )}

        <Field label="Recurso">
          <select
            value={resourceId}
            onChange={(e) => setResourceId(e.target.value)}
            className="press-fx"
            style={{
              width: "100%",
              padding: "11px 12px",
              border: "1px solid var(--line)",
              borderRadius: 10,
              fontSize: 14,
              fontFamily: "inherit",
              background: "var(--surface)",
              color: "var(--ink-1)",
            }}
          >
            <option value="">Todos los recursos</option>
            {resources.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </Field>

        {error && (
          <div
            style={{
              padding: "8px 12px",
              background: "#fdece7",
              color: "#c45a3c",
              borderRadius: 8,
              fontSize: 12,
              lineHeight: 1.4,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginTop: 8 }}>
          <Btn variant="primary" size="lg" loading={busy} onClick={submit}>
            Bloquear
          </Btn>
        </div>
      </div>
    </BottomSheet>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div
        className="font-mono"
        style={{
          fontSize: 10,
          color: "var(--ink-3)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function DateInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "11px 12px",
        border: "1px solid var(--line)",
        borderRadius: 10,
        fontSize: 14,
        fontFamily: "inherit",
        background: "var(--surface)",
        color: "var(--ink-1)",
      }}
    />
  );
}

function TimeInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "11px 12px",
        border: "1px solid var(--line)",
        borderRadius: 10,
        fontSize: 14,
        fontFamily: "inherit",
        background: "var(--surface)",
        color: "var(--ink-1)",
      }}
    />
  );
}
