"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Service, Resource } from "@/types/api";
import { AdminHeader } from "@/components/admin/admin-header";
import { BottomSheet } from "@/components/admin/bottom-sheet";
import { Btn } from "@/components/ui/btn";
import { Icon } from "@/components/ui/icon";
import { ResourceAvatar } from "@/components/ui/resource-avatar";

const DURATION_OPTIONS = [15, 30, 45, 60, 90];

// ─── Helpers ───────────────────────────────────────────────
function formatPrice(price: number | null) {
  if (price == null) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(price);
}

interface EditableService {
  id?: string;
  name: string;
  description: string;
  duration_minutes: number;
  buffer_minutes: number;
  price: number | null;
  resource_ids: string[];
}

// ─── Editor sheet ──────────────────────────────────────────
function ServiceEditor({
  service,
  resources,
  tenantId,
  onClose,
  onSaved,
  onDeleted,
}: {
  service: EditableService;
  resources: Resource[];
  tenantId: string;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const isNew = !service.id;
  const [s, setS] = useState<EditableService>(service);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = s.name.trim().length >= 2 && s.duration_minutes > 0;

  const toggleResource = (id: string) => {
    setS((prev) => ({
      ...prev,
      resource_ids: prev.resource_ids.includes(id)
        ? prev.resource_ids.filter((r) => r !== id)
        : [...prev.resource_ids, id],
    }));
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      let savedId: string;
      if (isNew) {
        const created = await api.post<Service>("/services", {
          tenant_id: tenantId,
          name: s.name.trim(),
          description: s.description.trim() || undefined,
          duration_minutes: s.duration_minutes,
          buffer_minutes: s.buffer_minutes,
          price: s.price,
        });
        savedId = created.id;
      } else {
        await api.patch<Service>(`/services/${s.id}`, {
          name: s.name.trim(),
          description: s.description.trim() || undefined,
          duration_minutes: s.duration_minutes,
          buffer_minutes: s.buffer_minutes,
          price: s.price,
        });
        savedId = s.id!;
      }

      // Sincronizar recursos: para cada recurso del tenant, si está en la lista nueva
      // y no en la vieja, agregar; si está en la vieja y no en la nueva, quitar.
      // En lugar de ello, simplemente mandamos PATCH /resources/:id/services
      // a cada recurso afectado con la lista completa de servicios que ahora ofrece.
      // Estrategia simple: para cada recurso que cambia (en la nueva lista o en la vieja
      // diferente), recalculamos sus servicios y enviamos PATCH.
      const allResources = await api.get<Resource[]>(`/resources?tenantId=${tenantId}`);
      const tasks: Promise<unknown>[] = [];
      for (const r of allResources) {
        const wasOffering = (r.services?.some((sv) => sv.id === savedId)) ?? false;
        const shouldOffer = s.resource_ids.includes(r.id);
        if (wasOffering !== shouldOffer) {
          const newServiceIds = shouldOffer
            ? [...(r.services?.map((sv) => sv.id) ?? []), savedId]
            : (r.services?.map((sv) => sv.id) ?? []).filter((id) => id !== savedId);
          tasks.push(api.patch(`/resources/${r.id}/services`, { service_ids: newServiceIds }));
        }
      }
      await Promise.all(tasks);

      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!s.id) return;
    if (!confirm(`¿Desactivar "${s.name}"? Los turnos existentes no se verán afectados, pero ya no estará disponible para reservas nuevas.`)) return;
    setDeleting(true);
    try {
      await api.patch<Service>(`/services/${s.id}/deactivate`, {});
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar");
    } finally {
      setDeleting(false);
    }
  };

  const inputBase = "w-full h-[44px] px-[12px] border border-line bg-surface rounded-sm text-[14px] text-ink-1 outline-none focus-visible:outline-[2px] focus-visible:outline-accent";

  return (
    <BottomSheet open onClose={onClose} title={isNew ? "Nuevo servicio" : "Editar servicio"}>
      <div className="flex flex-col gap-[14px]">
        {/* Nombre */}
        <div>
          <label className="block text-[12px] font-medium text-ink-2 mb-[6px]">Nombre</label>
          <input
            value={s.name}
            onChange={(e) => setS({ ...s, name: e.target.value })}
            placeholder="Corte de pelo"
            className={inputBase}
            style={{ fontFamily: "inherit" }}
          />
        </div>

        {/* Duración + precio */}
        <div className="flex gap-[10px]">
          <div className="flex-1">
            <label className="block text-[12px] font-medium text-ink-2 mb-[6px]">Duración</label>
            <div className="flex gap-[4px]">
              {DURATION_OPTIONS.map((d) => {
                const active = s.duration_minutes === d;
                return (
                  <button
                    key={d}
                    onClick={() => setS({ ...s, duration_minutes: d })}
                    className="press-fx flex-1 h-[36px] rounded-[8px] text-[11px] font-medium font-mono"
                    style={{
                      background: active ? "var(--ink-1)" : "var(--surface)",
                      color: active ? "var(--bg)" : "var(--ink-1)",
                      border: `1px solid ${active ? "var(--ink-1)" : "var(--line)"}`,
                      cursor: "pointer",
                    }}
                  >
                    {d}m
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-[12px] font-medium text-ink-2 mb-[6px]">Precio</label>
            <div className="relative">
              <span className="absolute left-[12px] top-[14px] text-[14px] text-ink-3 font-mono">$</span>
              <input
                type="number"
                value={s.price ?? ""}
                onChange={(e) => setS({ ...s, price: e.target.value ? Number(e.target.value) : null })}
                placeholder="0"
                className="w-full h-[44px] pl-[24px] pr-[12px] border border-line bg-surface rounded-sm text-[14px] text-ink-1 font-mono outline-none focus-visible:outline-[2px] focus-visible:outline-accent"
                style={{ fontFamily: "var(--font-jetbrains-mono)" }}
              />
            </div>
          </div>
        </div>

        {/* Buffer */}
        <div>
          <label className="block text-[12px] font-medium text-ink-2 mb-[6px]">
            Buffer entre turnos <span className="font-mono text-[10px] text-ink-3">opcional</span>
          </label>
          <div className="flex gap-[4px]">
            {[0, 5, 10, 15].map((b) => {
              const active = s.buffer_minutes === b;
              return (
                <button
                  key={b}
                  onClick={() => setS({ ...s, buffer_minutes: b })}
                  className="press-fx flex-1 h-[36px] rounded-[8px] text-[11px] font-medium font-mono"
                  style={{
                    background: active ? "var(--ink-1)" : "var(--surface)",
                    color: active ? "var(--bg)" : "var(--ink-1)",
                    border: `1px solid ${active ? "var(--ink-1)" : "var(--line)"}`,
                    cursor: "pointer",
                  }}
                >
                  {b === 0 ? "0" : `+${b}m`}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-ink-3 mt-[4px]">Tiempo entre turnos para limpieza/preparación.</p>
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-[12px] font-medium text-ink-2 mb-[6px]">
            Descripción <span className="font-mono text-[10px] text-ink-3">opcional</span>
          </label>
          <textarea
            value={s.description}
            onChange={(e) => setS({ ...s, description: e.target.value })}
            placeholder="Detalle visible al cliente"
            rows={2}
            className="w-full px-[12px] py-[10px] border border-line bg-surface rounded-sm text-[13px] text-ink-1 leading-[1.4] resize-none outline-none focus-visible:outline-[2px] focus-visible:outline-accent"
            style={{ fontFamily: "inherit" }}
          />
        </div>

        {/* Quién lo realiza */}
        <div>
          <label className="block text-[12px] font-medium text-ink-2 mb-[8px]">Quién lo realiza</label>
          {resources.length === 0 ? (
            <p className="text-[12px] text-ink-3">No hay recursos. Creá uno desde la pestaña Recursos.</p>
          ) : (
            <div className="flex flex-col gap-[6px]">
              {resources.map((r) => {
                const checked = s.resource_ids.includes(r.id);
                return (
                  <button
                    key={r.id}
                    onClick={() => toggleResource(r.id)}
                    className="press-fx flex items-center gap-[10px] px-[12px] py-[10px] rounded-sm bg-surface text-left"
                    style={{
                      border: `1px solid ${checked ? "var(--ink-1)" : "var(--line)"}`,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    <div
                      className="w-[18px] h-[18px] rounded-[5px] flex items-center justify-center flex-shrink-0"
                      style={{
                        background: checked ? "var(--ink-1)" : "transparent",
                        border: checked ? "none" : "1.5px solid var(--line)",
                      }}
                    >
                      {checked && <Icon name="check" size={11} color="var(--bg)" strokeWidth={3} />}
                    </div>
                    <ResourceAvatar
                      initials={r.name.slice(0, 2).toUpperCase()}
                      hue={r.hue ?? 24}
                      size={24}
                    />
                    <span className="text-[13px] font-medium">{r.name}</span>
                    {r.role && (
                      <span className="text-[11px] text-ink-3 ml-auto">{r.role}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && <p className="text-[12px] text-danger">{error}</p>}

        {/* Acciones */}
        <div className="flex flex-col gap-[8px] mt-[8px]">
          <Btn onClick={handleSave} loading={saving} disabled={!canSave} size="lg" full>
            {isNew ? "Crear servicio" : "Guardar cambios"}
          </Btn>
          {!isNew && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="press-fx text-[13px] text-danger py-[12px]"
              style={{ background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit" }}
            >
              {deleting ? "Eliminando…" : "Desactivar servicio"}
            </button>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}

// ─── Main view ─────────────────────────────────────────────
export function ServiciosView({ initialServices, resources, tenantId }: {
  initialServices: Service[];
  resources: Resource[];
  tenantId: string;
}) {
  const router = useRouter();
  const [services, setServices] = useState(initialServices);
  const [editing, setEditing] = useState<EditableService | null>(null);

  const reload = async () => {
    try {
      const fresh = await api.get<Service[]>(`/services?tenantId=${tenantId}`);
      setServices(fresh);
      router.refresh(); // invalida también el server component
    } catch {
      // silently ignore
    }
  };

  useEffect(() => { setServices(initialServices); }, [initialServices]);

  const openNew = () => {
    setEditing({
      name: "",
      description: "",
      duration_minutes: 30,
      buffer_minutes: 0,
      price: null,
      resource_ids: resources.map((r) => r.id),
    });
  };

  const openEdit = async (svc: Service) => {
    // Para saber qué recursos lo ofrecen, miramos los recursos del tenant
    const offering = resources.filter((r) =>
      r.services?.some((s) => s.id === svc.id),
    );
    setEditing({
      id: svc.id,
      name: svc.name,
      description: svc.description ?? "",
      duration_minutes: svc.duration_minutes,
      buffer_minutes: svc.buffer_minutes,
      price: svc.price,
      resource_ids: offering.map((r) => r.id),
    });
  };

  const activeCount = services.length;

  return (
    <>
      <AdminHeader title="Servicios" subtitle={`${activeCount} ${activeCount === 1 ? "activo" : "activos"}`} />

      <div className="flex-1 overflow-y-auto hide-scroll px-[20px] pt-[8px] pb-[100px]">
        {services.length === 0 ? (
          <div className="text-center py-[40px]">
            <div className="w-[56px] h-[56px] rounded-[16px] bg-line-2 inline-flex items-center justify-center">
              <Icon name="scissors" size={24} color="var(--ink-3)" />
            </div>
            <div className="font-serif text-[22px] mt-[18px]" style={{ letterSpacing: "-0.3px", lineHeight: 1.15 }}>
              Sin servicios
            </div>
            <p className="text-[13px] text-ink-2 mt-[8px] leading-[1.5]" style={{ maxWidth: 280, margin: "8px auto 0" }}>
              Creá tu primer servicio para empezar a recibir turnos.
            </p>
            <div className="mt-[20px]">
              <Btn variant="primary" size="md" full={false} onClick={openNew}>
                <Icon name="plus" size={14} color="var(--bg)" /> Crear servicio
              </Btn>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-[8px]">
              {services.map((s) => (
                <div
                  key={s.id}
                  className="bg-surface border border-line rounded flex items-center gap-[12px] px-[16px] py-[14px]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-medium" style={{ letterSpacing: "-0.2px" }}>
                      {s.name}
                    </div>
                    <div className="text-[12px] text-ink-3 mt-[2px] flex gap-[10px]">
                      <span className="font-mono">{s.duration_minutes} min</span>
                      <span>·</span>
                      <span className="font-mono">{formatPrice(s.price)}</span>
                      {s.buffer_minutes > 0 && (
                        <>
                          <span>·</span>
                          <span className="font-mono">+{s.buffer_minutes}m buffer</span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => openEdit(s)}
                    className="press-fx w-[32px] h-[32px] rounded-[8px] bg-line-2 flex items-center justify-center"
                    aria-label={`Editar ${s.name}`}
                  >
                    <Icon name="edit" size={14} color="var(--ink-1)" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={openNew}
              className="press-fx w-full mt-[12px] py-[14px] rounded text-ink-2 text-[13px] font-medium flex items-center justify-center gap-[6px]"
              style={{
                border: "1px dashed var(--line)",
                background: "transparent",
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              <Icon name="plus" size={14} color="var(--ink-2)" /> Agregar servicio
            </button>
          </>
        )}
      </div>

      {editing && (
        <ServiceEditor
          service={editing}
          resources={resources}
          tenantId={tenantId}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload(); }}
          onDeleted={() => { setEditing(null); reload(); }}
        />
      )}
    </>
  );
}
