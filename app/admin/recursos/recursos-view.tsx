"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Service, Resource } from "@/types/api";
import { AdminHeader } from "@/components/admin/admin-header";
import { BottomSheet } from "@/components/admin/bottom-sheet";
import { Btn } from "@/components/ui/btn";
import { Icon } from "@/components/ui/icon";
import { ResourceAvatar } from "@/components/ui/resource-avatar";

const HUE_OPTIONS = [24, 60, 140, 180, 220, 280, 340];

interface EditableResource {
  id?: string;
  name: string;
  role: string;
  hue: number;
  service_ids: string[];
}

// ─── Editor sheet ──────────────────────────────────────────
function ResourceEditor({
  resource,
  services,
  tenantId,
  onClose,
  onSaved,
  onDeleted,
}: {
  resource: EditableResource;
  services: Service[];
  tenantId: string;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const isNew = !resource.id;
  const [r, setR] = useState<EditableResource>(resource);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = r.name.trim().length >= 2;

  const toggleService = (id: string) => {
    setR((prev) => ({
      ...prev,
      service_ids: prev.service_ids.includes(id)
        ? prev.service_ids.filter((s) => s !== id)
        : [...prev.service_ids, id],
    }));
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      let savedId: string;
      if (isNew) {
        const created = await api.post<Resource>("/resources", {
          tenant_id: tenantId,
          name: r.name.trim(),
          role: r.role.trim() || undefined,
          hue: r.hue,
          service_ids: r.service_ids,
        });
        savedId = created.id;
      } else {
        await api.patch<Resource>(`/resources/${r.id}`, {
          name: r.name.trim(),
          role: r.role.trim() || undefined,
          hue: r.hue,
        });
        savedId = r.id!;
        // Para edición, sincronizar servicios por separado
        await api.patch(`/resources/${savedId}/services`, {
          service_ids: r.service_ids,
        });
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!r.id) return;
    if (!confirm(`¿Desactivar a ${r.name}? Los turnos existentes no se verán afectados.`)) return;
    setDeleting(true);
    try {
      await api.patch<Resource>(`/resources/${r.id}/deactivate`, {});
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar");
    } finally {
      setDeleting(false);
    }
  };

  const inputBase = "w-full h-[44px] px-[12px] border border-line bg-surface rounded-sm text-[14px] text-ink-1 outline-none focus-visible:outline-[2px] focus-visible:outline-accent";

  const initials = r.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "—";

  return (
    <BottomSheet open onClose={onClose} title={isNew ? "Nuevo recurso" : "Editar recurso"}>
      <div className="flex flex-col gap-[14px]">
        {/* Preview avatar */}
        <div className="flex justify-center pt-[4px]">
          <ResourceAvatar initials={initials} hue={r.hue} size={72} />
        </div>

        {/* Nombre */}
        <div>
          <label className="block text-[12px] font-medium text-ink-2 mb-[6px]">Nombre</label>
          <input
            value={r.name}
            onChange={(e) => setR({ ...r, name: e.target.value })}
            placeholder="Carlos"
            className={inputBase}
            style={{ fontFamily: "inherit" }}
          />
        </div>

        {/* Rol */}
        <div>
          <label className="block text-[12px] font-medium text-ink-2 mb-[6px]">
            Rol <span className="font-mono text-[10px] text-ink-3">opcional</span>
          </label>
          <input
            value={r.role}
            onChange={(e) => setR({ ...r, role: e.target.value })}
            placeholder="Barbero senior"
            className={inputBase}
            style={{ fontFamily: "inherit" }}
          />
        </div>

        {/* Color */}
        <div>
          <label className="block text-[12px] font-medium text-ink-2 mb-[8px]">Color</label>
          <div className="flex gap-[8px] flex-wrap">
            {HUE_OPTIONS.map((h) => {
              const active = h === r.hue;
              return (
                <button
                  key={h}
                  onClick={() => setR({ ...r, hue: h })}
                  className="press-fx w-[36px] h-[36px] rounded-full"
                  style={{
                    background: `oklch(0.78 0.08 ${h})`,
                    outline: active ? "2px solid var(--ink-1)" : "none",
                    outlineOffset: 2,
                    border: 0,
                    cursor: "pointer",
                  }}
                  aria-label={`Color ${h}`}
                />
              );
            })}
          </div>
        </div>

        {/* Servicios que ofrece */}
        <div>
          <label className="block text-[12px] font-medium text-ink-2 mb-[8px]">Servicios que ofrece</label>
          {services.length === 0 ? (
            <p className="text-[12px] text-ink-3">No hay servicios. Creá uno desde la pestaña Servicios.</p>
          ) : (
            <div className="flex flex-col gap-[6px]">
              {services.map((s) => {
                const checked = r.service_ids.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleService(s.id)}
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
                    <span className="text-[13px] font-medium flex-1">{s.name}</span>
                    <span className="font-mono text-[11px] text-ink-3">{s.duration_minutes}min</span>
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
            {isNew ? "Crear recurso" : "Guardar cambios"}
          </Btn>
          {!isNew && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="press-fx text-[13px] text-danger py-[12px]"
              style={{ background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit" }}
            >
              {deleting ? "Eliminando…" : "Desactivar recurso"}
            </button>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}

// ─── Main view ─────────────────────────────────────────────
export function RecursosView({
  initialResources,
  services,
  tenantId,
}: {
  initialResources: Resource[];
  services: Service[];
  tenantId: string;
}) {
  const router = useRouter();
  const [resources, setResources] = useState(initialResources);
  const [editing, setEditing] = useState<EditableResource | null>(null);

  const reload = async () => {
    try {
      const fresh = await api.get<Resource[]>(`/resources?tenantId=${tenantId}`);
      setResources(fresh);
      router.refresh();
    } catch {
      // silently
    }
  };

  const openNew = () => {
    setEditing({
      name: "",
      role: "",
      hue: HUE_OPTIONS[Math.floor(Math.random() * HUE_OPTIONS.length)],
      service_ids: services.map((s) => s.id),
    });
  };

  const openEdit = (r: Resource) => {
    setEditing({
      id: r.id,
      name: r.name,
      role: r.role ?? "",
      hue: r.hue ?? 24,
      service_ids: r.services?.map((s) => s.id) ?? [],
    });
  };

  return (
    <>
      <AdminHeader title="Recursos" subtitle={`${resources.length} ${resources.length === 1 ? "activo" : "activos"}`} />

      <div className="flex-1 overflow-y-auto hide-scroll px-[20px] pt-[8px] pb-[100px]">
        {resources.length === 0 ? (
          <div className="text-center py-[40px]">
            <div className="w-[56px] h-[56px] rounded-[16px] bg-line-2 inline-flex items-center justify-center">
              <Icon name="users" size={24} color="var(--ink-3)" />
            </div>
            <div className="font-serif text-[22px] mt-[18px]" style={{ letterSpacing: "-0.3px", lineHeight: 1.15 }}>
              Sin recursos
            </div>
            <p className="text-[13px] text-ink-2 mt-[8px] leading-[1.5]" style={{ maxWidth: 280, margin: "8px auto 0" }}>
              Agregá un profesional, una sala, una cancha — quien o qué realiza los servicios.
            </p>
            <div className="mt-[20px]">
              <Btn variant="primary" size="md" full={false} onClick={openNew}>
                <Icon name="plus" size={14} color="var(--bg)" /> Crear recurso
              </Btn>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-[8px]">
              {resources.map((r) => {
                const initials = r.name
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase();
                const offering = r.services?.length ?? 0;

                return (
                  <div key={r.id} className="bg-surface border border-line rounded p-[16px]">
                    <div className="flex items-center gap-[12px]">
                      <ResourceAvatar initials={initials} hue={r.hue ?? 24} size={44} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[15px] font-medium" style={{ letterSpacing: "-0.2px" }}>
                          {r.name}
                        </div>
                        {r.role && (
                          <div className="text-[12px] text-ink-3 mt-[2px] truncate">{r.role}</div>
                        )}
                      </div>
                      <button
                        onClick={() => openEdit(r)}
                        className="press-fx w-[32px] h-[32px] rounded-[8px] bg-line-2 flex items-center justify-center flex-shrink-0"
                        aria-label={`Editar ${r.name}`}
                      >
                        <Icon name="edit" size={14} color="var(--ink-1)" />
                      </button>
                    </div>
                    <div className="mt-[12px] pt-[12px] border-t border-line-2 flex gap-[6px]">
                      <Link
                        href={`/admin/recursos/${r.id}/horarios`}
                        className="press-fx flex-1 h-[34px] flex items-center justify-center gap-[5px] rounded-[8px] bg-surface border border-line text-[12px] font-medium"
                      >
                        <Icon name="clock" size={12} color="var(--ink-1)" /> Horarios
                      </Link>
                      <button
                        onClick={() => openEdit(r)}
                        className="press-fx flex-1 h-[34px] flex items-center justify-center gap-[5px] rounded-[8px] bg-surface border border-line text-[12px] font-medium"
                        style={{ fontFamily: "inherit", cursor: "pointer" }}
                      >
                        <Icon name="scissors" size={12} color="var(--ink-1)" /> Servicios ({offering})
                      </button>
                    </div>
                  </div>
                );
              })}
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
              <Icon name="plus" size={14} color="var(--ink-2)" /> Agregar recurso
            </button>
          </>
        )}
      </div>

      {editing && (
        <ResourceEditor
          resource={editing}
          services={services}
          tenantId={tenantId}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload(); }}
          onDeleted={() => { setEditing(null); reload(); }}
        />
      )}
    </>
  );
}
