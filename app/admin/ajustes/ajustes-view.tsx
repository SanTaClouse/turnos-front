"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { clearTenantCookie } from "@/app/actions";
import type { Tenant } from "@/types/api";
import { AdminHeader } from "@/components/admin/admin-header";
import { BottomSheet } from "@/components/admin/bottom-sheet";
import { BrandMark } from "@/components/ui/brand-mark";
import { Btn } from "@/components/ui/btn";
import { Icon } from "@/components/ui/icon";

// ─── Helpers ───────────────────────────────────────────────
function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// ─── SectionRow ────────────────────────────────────────────
type IconName = Parameters<typeof Icon>[0]["name"];

function SectionRow({
  icon,
  title,
  subtitle,
  onClick,
  danger = false,
  disabled = false,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="press-fx w-full flex items-center gap-[12px] px-[16px] py-[14px] text-left disabled:opacity-50"
      style={{
        background: "transparent",
        border: 0,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit",
      }}
    >
      <div
        className="w-[32px] h-[32px] rounded-[8px] bg-line-2 flex items-center justify-center flex-shrink-0"
      >
        <Icon name={icon} size={15} color={danger ? "var(--danger)" : "var(--ink-2)"} />
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="text-[14px] font-medium"
          style={{
            color: danger ? "var(--danger)" : "var(--ink-1)",
            letterSpacing: "-0.2px",
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div className="text-[12px] text-ink-3 mt-[2px] truncate">{subtitle}</div>
        )}
      </div>
      {!danger && !disabled && (
        <Icon name="chevronRight" size={14} color="var(--ink-3)" />
      )}
    </button>
  );
}

// ─── Sheet: Información del negocio ────────────────────────
function InfoSheet({ tenant, onClose, onSaved }: {
  tenant: Tenant;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: tenant.name,
    description: tenant.description ?? "",
    address: tenant.address ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputBase = "w-full h-[44px] px-[12px] border border-line bg-surface rounded-sm text-[14px] text-ink-1 outline-none focus-visible:outline-[2px] focus-visible:outline-accent";

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/tenants/${tenant.id}`, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        address: form.address.trim() || undefined,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open onClose={onClose} title="Información del negocio">
      <div className="flex flex-col gap-[14px]">
        <div>
          <label className="block text-[12px] font-medium text-ink-2 mb-[6px]">Nombre</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputBase}
            style={{ fontFamily: "inherit" }}
          />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-ink-2 mb-[6px]">
            Descripción <span className="font-mono text-[10px] text-ink-3">opcional</span>
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            placeholder="Lo que va a aparecer en la landing pública"
            className="w-full px-[12px] py-[10px] border border-line bg-surface rounded-sm text-[14px] text-ink-1 leading-[1.4] resize-none outline-none focus-visible:outline-[2px] focus-visible:outline-accent"
            style={{ fontFamily: "inherit" }}
          />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-ink-2 mb-[6px]">
            Dirección <span className="font-mono text-[10px] text-ink-3">opcional</span>
          </label>
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Av. Siempre Viva 742"
            className={inputBase}
            style={{ fontFamily: "inherit" }}
          />
        </div>
        {error && <p className="text-[12px] text-danger">{error}</p>}
        <Btn onClick={handleSave} loading={saving} disabled={form.name.trim().length < 2} size="lg" full className="mt-[6px]">
          Guardar cambios
        </Btn>
      </div>
    </BottomSheet>
  );
}

// ─── Sheet: URL pública (slug) ─────────────────────────────
function UrlSheet({ tenant, onClose, onSaved }: {
  tenant: Tenant;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [slug, setSlug] = useState(tenant.slug);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = /^[a-z0-9-]+$/.test(slug) && slug.length >= 3 && slug.length <= 60;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/tenants/${tenant.id}`, { slug });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar. ¿Slug ya en uso?");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open onClose={onClose} title="URL pública">
      <div className="flex flex-col gap-[14px]">
        <p className="text-[13px] text-ink-2 leading-[1.5]">
          Es donde tus clientes van a reservar. Cambiar el slug rompe los links viejos compartidos.
        </p>
        <div className="bg-surface border border-line rounded px-[14px] py-[14px]">
          <div className="font-mono text-[11px] text-ink-3" style={{ letterSpacing: "0.05em" }}>
            turnosapp.com/
          </div>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            placeholder="mi-negocio"
            className="w-full bg-transparent border-0 outline-none mt-[2px] font-mono text-[18px] font-medium text-ink-1 p-0"
            style={{ fontFamily: "var(--font-jetbrains-mono)", letterSpacing: "-0.3px" }}
          />
        </div>
        <p className="text-[11px] text-ink-3">
          Solo letras minúsculas, números y guiones. Entre 3 y 60 caracteres.
        </p>
        {error && <p className="text-[12px] text-danger">{error}</p>}
        <Btn onClick={handleSave} loading={saving} disabled={!valid || slug === tenant.slug} size="lg" full>
          Guardar URL
        </Btn>
      </div>
    </BottomSheet>
  );
}

// ─── Sheet: WhatsApp ───────────────────────────────────────
function WhatsappSheet({ tenant, onClose, onSaved }: {
  tenant: Tenant;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [whatsapp, setWhatsapp] = useState(tenant.whatsapp_number);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = whatsapp.replace(/\D/g, "").length >= 8;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/tenants/${tenant.id}`, { whatsapp_number: whatsapp });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open onClose={onClose} title="Teléfono y WhatsApp">
      <div className="flex flex-col gap-[14px]">
        <p className="text-[13px] text-ink-2 leading-[1.5]">
          El número que ven los clientes en tu landing y donde reciben confirmaciones por WhatsApp.
        </p>
        <div>
          <label className="block text-[12px] font-medium text-ink-2 mb-[6px]">Número (con código de país)</label>
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="+5491155552200"
            inputMode="tel"
            className="w-full h-[44px] px-[12px] border border-line bg-surface rounded-sm text-[14px] text-ink-1 font-mono outline-none focus-visible:outline-[2px] focus-visible:outline-accent"
            style={{ fontFamily: "var(--font-jetbrains-mono)" }}
          />
        </div>
        {error && <p className="text-[12px] text-danger">{error}</p>}
        <Btn onClick={handleSave} loading={saving} disabled={!valid || whatsapp === tenant.whatsapp_number} size="lg" full>
          Guardar
        </Btn>
      </div>
    </BottomSheet>
  );
}

// ─── Sheet: Próximamente (placeholder genérico) ────────────
function ComingSoonSheet({ title, description, onClose }: {
  title: string;
  description: string;
  onClose: () => void;
}) {
  return (
    <BottomSheet open onClose={onClose} title={title}>
      <div className="text-center py-[32px]">
        <div className="w-[56px] h-[56px] rounded-[16px] bg-line-2 inline-flex items-center justify-center">
          <Icon name="sparkle" size={24} color="var(--ink-3)" />
        </div>
        <div className="font-serif text-[20px] mt-[18px]" style={{ letterSpacing: "-0.3px" }}>
          Próximamente
        </div>
        <p className="text-[13px] text-ink-2 mt-[8px] leading-[1.5]" style={{ maxWidth: 280, margin: "8px auto 0" }}>
          {description}
        </p>
        <Btn variant="secondary" size="md" full={false} onClick={onClose} className="mt-[20px]">
          Entendido
        </Btn>
      </div>
    </BottomSheet>
  );
}

// ─── Main view ─────────────────────────────────────────────
type SheetType = "info" | "url" | "whatsapp" | "hours" | "reminders" | "policy" | "team" | "security" | null;

export function AjustesView({ initialTenant }: { initialTenant: Tenant }) {
  const router = useRouter();
  const [tenant, setTenant] = useState(initialTenant);
  const [openSheet, setOpenSheet] = useState<SheetType>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const initials = getInitials(tenant.name);
  const publicUrl = `turnosapp.com/${tenant.slug}`;

  const handleSaved = async () => {
    try {
      const fresh = await api.get<Tenant>(`/tenants/${tenant.id}`);
      setTenant(fresh);
      router.refresh();
    } catch { /* silently */ }
    setOpenSheet(null);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`https://${publicUrl}`);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1500);
    } catch { /* silently */ }
  };

  return (
    <>
      <AdminHeader title="Ajustes" />

      <div className="flex-1 overflow-y-auto hide-scroll px-[20px] pt-[4px] pb-[100px]">

        {/* Top card: brand + nombre + URL + acciones */}
        <div className="bg-surface border border-line rounded p-[18px_16px] mb-[20px]">
          <div className="flex items-center gap-[14px]">
            <BrandMark initials={initials} size={52} />
            <div className="flex-1 min-w-0">
              <div className="font-serif text-[22px] truncate" style={{ letterSpacing: "-0.3px" }}>
                {tenant.name}
              </div>
              <div className="font-mono text-[11px] text-ink-3 mt-[2px] truncate">{publicUrl}</div>
            </div>
          </div>
          <div className="flex gap-[8px] mt-[14px]">
            <Link
              href={`/${tenant.slug}`}
              target="_blank"
              className="press-fx flex-1 h-[36px] flex items-center justify-center gap-[5px] rounded-[8px] border border-line bg-bg text-[12px] font-medium"
            >
              <Icon name="eye" size={13} color="var(--ink-1)" /> Ver landing
            </Link>
            <button
              onClick={handleCopy}
              className="press-fx flex-1 h-[36px] flex items-center justify-center gap-[5px] rounded-[8px] border border-line bg-bg text-[12px] font-medium"
              style={{ fontFamily: "inherit", cursor: "pointer" }}
            >
              <Icon name={linkCopied ? "check" : "copy"} size={13} color="var(--ink-1)" />
              {linkCopied ? "Copiado" : "Copiar link"}
            </button>
          </div>
        </div>

        {/* Grupo: Negocio */}
        <Group label="Negocio">
          <SectionRow
            icon="store"
            title="Información del negocio"
            subtitle={tenant.description || "Nombre, descripción, dirección"}
            onClick={() => setOpenSheet("info")}
          />
          <Divider />
          <SectionRow
            icon="image"
            title="Logo y portada"
            subtitle="Personalizar imagen"
            onClick={() => setOpenSheet("hours")}
            disabled
          />
          <Divider />
          <SectionRow
            icon="link"
            title="URL pública"
            subtitle={publicUrl}
            onClick={() => setOpenSheet("url")}
          />
        </Group>

        {/* Grupo: Operación */}
        <Group label="Operación">
          <SectionRow
            icon="clock"
            title="Horarios del negocio"
            subtitle="Configurá horarios por recurso"
            onClick={() => router.push("/admin/recursos")}
          />
          <Divider />
          <SectionRow
            icon="bell"
            title="Recordatorios"
            subtitle="24hs antes por WhatsApp"
            onClick={() => setOpenSheet("reminders")}
          />
          <Divider />
          <SectionRow
            icon="shield"
            title="Política de cancelación"
            subtitle="2 horas de anticipación"
            onClick={() => setOpenSheet("policy")}
          />
        </Group>

        {/* Grupo: Equipo */}
        <Group label="Equipo">
          <SectionRow
            icon="users"
            title="Usuarios y roles"
            subtitle="Próximamente"
            onClick={() => setOpenSheet("team")}
          />
        </Group>

        {/* Grupo: Cuenta */}
        <Group label="Cuenta">
          <SectionRow
            icon="phone"
            title="Teléfono y WhatsApp"
            subtitle={tenant.whatsapp_number}
            onClick={() => setOpenSheet("whatsapp")}
          />
          <Divider />
          <SectionRow
            icon="lock"
            title="Seguridad"
            subtitle="Próximamente"
            onClick={() => setOpenSheet("security")}
          />
          <Divider />
          <SectionRow
            icon="close"
            title="Cerrar sesión"
            danger
            onClick={async () => {
              if (confirm("¿Cerrar sesión? Vas a salir del panel y volver a la home.")) {
                await clearTenantCookie();
              }
            }}
          />
        </Group>

        {/* Footer */}
        <div className="text-center pt-[16px]">
          <div className="font-mono text-[10px] text-ink-3" style={{ letterSpacing: "0.05em" }}>
            TurnosApp · v1.0.0
          </div>
        </div>
      </div>

      {/* Sheets */}
      {openSheet === "info" && (
        <InfoSheet tenant={tenant} onClose={() => setOpenSheet(null)} onSaved={handleSaved} />
      )}
      {openSheet === "url" && (
        <UrlSheet tenant={tenant} onClose={() => setOpenSheet(null)} onSaved={handleSaved} />
      )}
      {openSheet === "whatsapp" && (
        <WhatsappSheet tenant={tenant} onClose={() => setOpenSheet(null)} onSaved={handleSaved} />
      )}
      {openSheet === "reminders" && (
        <ComingSoonSheet
          title="Recordatorios"
          description="Vamos a permitirte configurar mensajes automáticos de WhatsApp 24h antes del turno cuando integremos WhatsApp Business."
          onClose={() => setOpenSheet(null)}
        />
      )}
      {openSheet === "policy" && (
        <ComingSoonSheet
          title="Política de cancelación"
          description="Configurá cuánto tiempo antes los clientes pueden cancelar sin penalización. Por ahora son 2 horas fijas."
          onClose={() => setOpenSheet(null)}
        />
      )}
      {openSheet === "team" && (
        <ComingSoonSheet
          title="Usuarios y roles"
          description="Pronto vas a poder invitar a tu equipo con distintos permisos: dueño, recepcionista, profesional."
          onClose={() => setOpenSheet(null)}
        />
      )}
      {openSheet === "security" && (
        <ComingSoonSheet
          title="Seguridad"
          description="Configuración de PIN, autenticación de dos factores y sesiones activas. Disponible cuando lancemos auth."
          onClose={() => setOpenSheet(null)}
        />
      )}
    </>
  );
}

// ─── Group + Divider ───────────────────────────────────────
function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-[16px]">
      <div className="label-mono px-[4px] pb-[8px]" style={{ fontWeight: 500 }}>
        {label}
      </div>
      <div className="bg-surface border border-line rounded overflow-hidden">{children}</div>
    </div>
  );
}

function Divider() {
  return <div className="h-[1px] bg-line-2 mx-[16px]" />;
}
