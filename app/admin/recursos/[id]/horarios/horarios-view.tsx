"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Resource, Availability } from "@/types/api";
import { Btn } from "@/components/ui/btn";
import { Icon } from "@/components/ui/icon";
import { ResourceAvatar } from "@/components/ui/resource-avatar";

const DAY_NAMES = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

// El backend usa: 0 = domingo, 6 = sábado
// La UI muestra Lun primero. Mapping: indexUI 0 = Lun (dow=1), ..., 5 = Sáb (dow=6), 6 = Dom (dow=0)
const UI_TO_DOW = [1, 2, 3, 4, 5, 6, 0];

interface Range {
  from: string;
  to: string;
  existingId?: string; // si viene del backend
}

interface DaySchedule {
  dayName: string;
  dayOfWeek: number;
  open: boolean;
  ranges: Range[];
}

function buildInitialSchedule(availabilities: Availability[]): DaySchedule[] {
  return UI_TO_DOW.map((dow, i) => {
    const rules = availabilities
      .filter((a) => a.day_of_week === dow)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
    return {
      dayName: DAY_NAMES[i],
      dayOfWeek: dow,
      open: rules.length > 0,
      ranges: rules.length
        ? rules.map((r) => ({
            from: r.start_time.slice(0, 5),
            to: r.end_time.slice(0, 5),
            existingId: r.id,
          }))
        : [{ from: "10:00", to: "20:00" }],
    };
  });
}

// ─── Toggle ────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="press-fx"
      style={{
        width: 40,
        height: 24,
        border: 0,
        padding: 2,
        borderRadius: 999,
        cursor: "pointer",
        background: value ? "var(--ink-1)" : "var(--line)",
        transition: "background 0.18s",
        display: "flex",
        alignItems: "center",
        justifyContent: value ? "flex-end" : "flex-start",
      }}
      aria-label={value ? "Cerrar día" : "Abrir día"}
    >
      <span
        className="block w-[20px] h-[20px] rounded-full bg-white"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }}
      />
    </button>
  );
}

// ─── Time input (native HH:MM) ─────────────────────────────
function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 h-[36px] px-[12px] bg-bg border border-line rounded-[8px] text-[13px] font-medium font-mono text-center text-ink-1 outline-none focus-visible:outline-[2px] focus-visible:outline-accent"
      style={{ fontFamily: "var(--font-jetbrains-mono)", letterSpacing: "-0.2px" }}
    />
  );
}

// ─── Main ──────────────────────────────────────────────────
export function HorariosView({
  resource,
  initialAvailabilities,
  tenantId,
}: {
  resource: Resource;
  initialAvailabilities: Availability[];
  tenantId: string;
}) {
  const router = useRouter();
  const [schedule, setSchedule] = useState<DaySchedule[]>(() =>
    buildInitialSchedule(initialAvailabilities),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const initials = resource.name.slice(0, 2).toUpperCase();

  const updateDay = (i: number, patch: Partial<DaySchedule>) => {
    setSchedule((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  };

  const addRange = (i: number) => {
    setSchedule((prev) =>
      prev.map((d, idx) =>
        idx === i ? { ...d, ranges: [...d.ranges, { from: "14:00", to: "18:00" }] } : d,
      ),
    );
  };

  const removeRange = (i: number, ri: number) => {
    setSchedule((prev) =>
      prev.map((d, idx) =>
        idx === i ? { ...d, ranges: d.ranges.filter((_, j) => j !== ri) } : d,
      ),
    );
  };

  const updateRange = (i: number, ri: number, patch: Partial<Range>) => {
    setSchedule((prev) =>
      prev.map((d, idx) =>
        idx === i
          ? { ...d, ranges: d.ranges.map((r, j) => (j === ri ? { ...r, ...patch } : r)) }
          : d,
      ),
    );
  };

  // Guarda: borra todas las availabilities viejas del recurso, crea las nuevas
  const handleSave = async () => {
    // Validación
    for (const day of schedule) {
      if (!day.open) continue;
      for (const r of day.ranges) {
        if (r.from >= r.to) {
          setError(`En ${day.dayName}: la hora de inicio debe ser menor a la de fin.`);
          return;
        }
      }
    }

    setSaving(true);
    setError(null);

    try {
      // 1. Borrar las viejas
      const oldIds = initialAvailabilities.map((a) => a.id);
      await Promise.all(
        oldIds.map((id) =>
          api.delete(`/availability/${id}`).catch(() => null),
        ),
      );

      // 2. Crear las nuevas
      for (const day of schedule) {
        if (!day.open) continue;
        for (const r of day.ranges) {
          await api.post("/availability", {
            tenant_id: tenantId,
            resource_id: resource.id,
            day_of_week: day.dayOfWeek,
            start_time: r.from,
            end_time: r.to,
            slot_duration: 30,
          });
        }
      }

      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron guardar los horarios");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Header con back */}
      <div className="flex-shrink-0 px-[20px] pt-[8px] pb-[12px] flex items-center gap-[10px]">
        <button
          onClick={() => router.push("/admin/recursos")}
          className="press-fx w-[36px] h-[36px] rounded-full border border-line bg-surface flex items-center justify-center"
          aria-label="Volver"
        >
          <Icon name="back" size={14} color="var(--ink-1)" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="label-mono">Horarios</div>
          <div className="text-[18px] font-semibold flex items-center gap-[8px]" style={{ letterSpacing: "-0.3px" }}>
            <ResourceAvatar initials={initials} hue={resource.hue ?? 24} size={22} />
            <span className="truncate">{resource.name}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto hide-scroll px-[20px] pt-[8px] pb-[120px]">
        <div className="flex flex-col gap-[6px]">
          {schedule.map((day, i) => (
            <div
              key={day.dayName}
              className="rounded px-[14px] py-[12px]"
              style={{
                background: day.open ? "var(--surface)" : "var(--line-2)",
                border: "1px solid var(--line)",
              }}
            >
              <div className="flex items-center gap-[10px]">
                <span
                  className="text-[14px] font-medium flex-1"
                  style={{ color: day.open ? "var(--ink-1)" : "var(--ink-3)" }}
                >
                  {day.dayName}
                </span>
                <Toggle value={day.open} onChange={(v) => updateDay(i, { open: v })} />
              </div>

              {day.open && (
                <div className="mt-[10px] flex flex-col gap-[6px]">
                  {day.ranges.map((r, ri) => (
                    <div key={ri} className="flex gap-[8px] items-center">
                      <TimeInput
                        value={r.from}
                        onChange={(v) => updateRange(i, ri, { from: v })}
                      />
                      <span className="text-ink-3">—</span>
                      <TimeInput
                        value={r.to}
                        onChange={(v) => updateRange(i, ri, { to: v })}
                      />
                      {day.ranges.length > 1 && (
                        <button
                          onClick={() => removeRange(i, ri)}
                          className="press-fx w-[28px] h-[28px] rounded-[6px] bg-line-2 flex items-center justify-center flex-shrink-0"
                          style={{ border: 0, cursor: "pointer" }}
                          aria-label="Eliminar rango"
                        >
                          <Icon name="close" size={12} color="var(--ink-2)" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => addRange(i)}
                    className="press-fx self-start py-[6px] px-[10px] rounded-[6px] text-[11px] font-medium text-ink-2"
                    style={{
                      border: "1px dashed var(--line)",
                      background: "transparent",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    + Partir turno
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {error && (
          <p className="text-[12px] text-danger mt-[12px] text-center">{error}</p>
        )}
      </div>

      {/* Footer fijo con guardar */}
      <div
        className="flex-shrink-0 px-[20px] py-[12px] bg-bg border-t border-line"
        style={{ position: "absolute", bottom: 56, left: 0, right: 0, maxWidth: 430, margin: "0 auto" }}
      >
        <Btn onClick={handleSave} loading={saving} size="lg" full>
          {savedFlash ? (
            <>
              <Icon name="check" size={16} color="var(--bg)" /> Guardado
            </>
          ) : (
            "Guardar horarios"
          )}
        </Btn>
      </div>
    </>
  );
}
