"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { uploadTenantLogo, validateImage, isCloudinaryConfigured } from "@/lib/cloudinary";
import {
  logoutAction,
  revokeSessionAction,
  getMpConnectUrlAction,
  disconnectMpAction,
  updatePaymentOptionsAction,
} from "@/app/actions";
import { getFrontendDomain } from "@/lib/config";
import { COUNTRY_OPTIONS, countryByTimezone } from "@/lib/timezone-utils";
import type { Tenant, AdminSession, PaymentSettings } from "@/types/api";
import { AdminHeader } from "@/components/admin/admin-header";
import { BottomSheet } from "@/components/admin/bottom-sheet";
import { BrandMark } from "@/components/ui/brand-mark";
import { Btn } from "@/components/ui/btn";
import { Icon } from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";

const MP_CYAN = "#009ee3";

function depositSummary(p: PaymentSettings | null): string {
  if (!p || !p.connected) return "Conectá Mercado Pago para cobrar señas";
  const parts: string[] = [];
  if (p.allow_deposit)
    parts.push(p.deposit_type === "percent" ? `seña ${p.deposit_value}%` : "seña fija");
  if (p.allow_full) parts.push("pago completo");
  if (p.allow_pay_later) parts.push("pagar en el local");
  return parts.length ? "Conectado · " + parts.join(" · ") : "Conectado · sin opciones";
}

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

// ─── Sheet: Foto de perfil (logo) ──────────────────────────
function LogoSheet({ tenant, onClose, onSaved }: {
  tenant: Tenant;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [logoUrl, setLogoUrl] = useState<string | null>(tenant.logo_url);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const initials = getInitials(tenant.name);
  const dirty = logoUrl !== tenant.logo_url;
  const configured = isCloudinaryConfigured();

  const handlePick = () => fileRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo
    if (!file) return;

    const validationError = validateImage(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const url = await uploadTenantLogo(file);
      setLogoUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setLogoUrl(null);
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/tenants/${tenant.id}`, { logo_url: logoUrl });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open onClose={onClose} title="Foto de perfil">
      <div className="flex flex-col items-center gap-[14px]">
        <p className="text-[13px] text-ink-2 leading-[1.5] text-center">
          La imagen que ven tus clientes en tu landing pública y en el panel.
        </p>

        {/* Preview */}
        <div className="relative">
          <BrandMark initials={initials} imageUrl={logoUrl} size={104} />
          {uploading && (
            <div className="absolute inset-0 rounded-[29px] flex items-center justify-center bg-black/40">
              <Icon name="sparkle" size={22} color="#fff" />
            </div>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFile}
          className="hidden"
        />

        <div className="flex gap-[8px] w-full">
          <Btn
            variant="secondary"
            size="md"
            full
            onClick={handlePick}
            disabled={uploading || !configured}
          >
            {uploading ? "Subiendo…" : logoUrl ? "Cambiar foto" : "Subir foto"}
          </Btn>
          {logoUrl && (
            <Btn variant="secondary" size="md" full onClick={handleRemove} disabled={uploading}>
              Quitar
            </Btn>
          )}
        </div>

        {!configured && (
          <p className="text-[11px] text-ink-3 leading-[1.5] text-center flex items-start gap-[6px]">
            <Icon name="alert" size={13} color="var(--ink-3)" className="flex-shrink-0 mt-[1px]" />
            Falta configurar Cloudinary (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME y _UPLOAD_PRESET).
          </p>
        )}

        {error && <p className="text-[12px] text-danger text-center">{error}</p>}

        <Btn
          onClick={handleSave}
          loading={saving}
          disabled={!dirty || uploading}
          size="lg"
          full
          className="mt-[2px]"
        >
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
            {getFrontendDomain()}/
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
  const [countryCode, setCountryCode] = useState(tenant.country_code || "+54");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = whatsapp.replace(/\D/g, "").length >= 8;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/tenants/${tenant.id}`, { whatsapp_number: whatsapp, country_code: countryCode });
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
          <label className="block text-[12px] font-medium text-ink-2 mb-[6px]">Código de país</label>
          <input
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value.replace(/[^\d+]/g, ""))}
            placeholder="+54"
            inputMode="tel"
            className="w-full h-[44px] px-[12px] border border-line bg-surface rounded-sm text-[14px] text-ink-1 font-mono outline-none focus-visible:outline-[2px] focus-visible:outline-accent"
            style={{ fontFamily: "var(--font-jetbrains-mono)" }}
          />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-ink-2 mb-[6px]">Número (sin código de país)</label>
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="1155552200"
            inputMode="tel"
            className="w-full h-[44px] px-[12px] border border-line bg-surface rounded-sm text-[14px] text-ink-1 font-mono outline-none focus-visible:outline-[2px] focus-visible:outline-accent"
            style={{ fontFamily: "var(--font-jetbrains-mono)" }}
          />
        </div>
        {error && <p className="text-[12px] text-danger">{error}</p>}
        <Btn onClick={handleSave} loading={saving} disabled={!valid || (whatsapp === tenant.whatsapp_number && countryCode === (tenant.country_code || "+54"))} size="lg" full>
          Guardar
        </Btn>
      </div>
    </BottomSheet>
  );
}

// ─── Sheet: Dispositivos conectados ────────────────────────
function formatRelative(dateStr: string | null): string {
  if (!dateStr) return "—";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `hace ${hr} h`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `hace ${d} día${d > 1 ? "s" : ""}`;
  const m = Math.floor(d / 30);
  return `hace ${m} mes${m > 1 ? "es" : ""}`;
}

function DevicesSheet({
  sessions,
  currentSessionId,
  onClose,
  onChanged,
}: {
  sessions: AdminSession[];
  currentSessionId: string;
  onClose: () => void;
  onChanged: (next: AdminSession[]) => void;
}) {
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRevoke = async (id: string) => {
    if (id === currentSessionId) return;
    if (!confirm("¿Cerrar esta sesión? El otro dispositivo va a tener que volver a entrar con el código.")) return;
    setRevoking(id);
    setError(null);
    try {
      await revokeSessionAction(id);
      onChanged(sessions.filter((s) => s.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cerrar la sesión");
    } finally {
      setRevoking(null);
    }
  };

  return (
    <BottomSheet open onClose={onClose} title="Dispositivos conectados">
      <div className="flex flex-col gap-[10px]">
        <p className="text-[13px] text-ink-2 leading-[1.5]">
          Estas son las sesiones activas en tu cuenta. Si un dispositivo no es
          tuyo o ya no lo usás, cerralo desde acá.
        </p>
        <div className="bg-surface border border-line rounded overflow-hidden">
          {sessions.length === 0 ? (
            <div className="px-[16px] py-[18px] text-[13px] text-ink-3 text-center">
              No hay sesiones activas.
            </div>
          ) : (
            sessions.map((s, i) => {
              const isCurrent = s.id === currentSessionId;
              return (
                <div key={s.id}>
                  {i > 0 && <Divider />}
                  <div className="flex items-center gap-[12px] px-[16px] py-[14px]">
                    <div className="w-[32px] h-[32px] rounded-[8px] bg-line-2 flex items-center justify-center flex-shrink-0">
                      <Icon name="phone" size={15} color="var(--ink-2)" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-medium" style={{ letterSpacing: "-0.2px" }}>
                        {s.device_label ?? "Dispositivo desconocido"}
                        {isCurrent && (
                          <span className="ml-[8px] text-[10px] font-mono text-accent uppercase">
                            Este device
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-ink-3 mt-[2px]">
                        Última actividad: {formatRelative(s.last_used_at)}
                      </div>
                    </div>
                    {!isCurrent && (
                      <button
                        onClick={() => handleRevoke(s.id)}
                        disabled={revoking === s.id}
                        className="press-fx text-[12px] font-medium text-danger disabled:opacity-50"
                        style={{ background: "transparent", border: 0, cursor: "pointer" }}
                      >
                        {revoking === s.id ? "..." : "Cerrar"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        {error && <p className="text-[12px] text-danger">{error}</p>}
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

// ─── Sheet: Cobros y opciones de pago (Mercado Pago) ──────
function PaymentsSheet({
  initial,
  currency,
  flash,
  onClose,
  onConfigSaved,
}: {
  initial: PaymentSettings | null;
  currency: string;
  flash: "connected" | "error" | null;
  onClose: () => void;
  onConfigSaved: (partial: Partial<PaymentSettings>) => void;
}) {
  const connected = initial?.connected ?? false;
  const [allowDeposit, setAllowDeposit] = useState(initial?.allow_deposit ?? false);
  const [depositType, setDepositType] = useState<"percent" | "fixed">(
    initial?.deposit_type ?? "percent",
  );
  const [value, setValue] = useState(
    initial?.deposit_value ? String(initial.deposit_value) : "",
  );
  const [allowFull, setAllowFull] = useState(initial?.allow_full ?? false);
  const [allowPayLater, setAllowPayLater] = useState(initial?.allow_pay_later ?? true);
  const [requireDeposit, setRequireDeposit] = useState(
    initial?.require_deposit_new_clients ?? false,
  );
  const [connecting, setConnecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numValue = Number(value);
  const percentTooBig = depositType === "percent" && numValue > 100;
  const depositValid =
    !allowDeposit ||
    (Number.isFinite(numValue) && numValue > 0 && !percentTooBig);
  const anyEnabled = allowDeposit || allowFull || allowPayLater;
  const valid = depositValid && anyEnabled;

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const { url } = await getMpConnectUrlAction();
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar la conexión");
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("¿Desconectar Mercado Pago? Vas a dejar de poder cobrar señas.")) return;
    try {
      await disconnectMpAction();
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo desconectar");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const saved = await updatePaymentOptionsAction({
        allow_deposit: allowDeposit,
        deposit_type: depositType,
        deposit_value: allowDeposit ? numValue : undefined,
        allow_full: allowFull,
        allow_pay_later: allowPayLater,
        require_deposit_new_clients: allowDeposit && requireDeposit,
      });
      onConfigSaved(saved);
      setAllowPayLater(saved.allow_pay_later);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1600);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open onClose={onClose} title="Cobros y señas">
      <div className="flex flex-col gap-[16px]">
        {/* Banner de resultado del OAuth */}
        {flash === "connected" && (
          <div className="flex items-center gap-[8px] px-[14px] py-[10px] rounded-[10px] text-[12px]" style={{ background: "rgba(46,160,90,0.12)", color: "#2e8b57" }}>
            <Icon name="check" size={14} color="#2e8b57" strokeWidth={2.5} />
            ¡Mercado Pago conectado con éxito!
          </div>
        )}
        {flash === "error" && (
          <div className="flex items-center gap-[8px] px-[14px] py-[10px] rounded-[10px] text-[12px]" style={{ background: "rgba(196,90,60,0.10)", color: "var(--danger)" }}>
            <Icon name="alert" size={14} color="var(--danger)" />
            No se pudo conectar. Probá de nuevo.
          </div>
        )}

        {/* Conexión de Mercado Pago */}
        {connected ? (
          <div>
            <div className="flex items-center gap-[12px] px-[14px] py-[12px] rounded-[12px] bg-line-2">
              <div className="w-[34px] h-[34px] rounded-full flex items-center justify-center flex-shrink-0" style={{ background: MP_CYAN }}>
                <Icon name="check" size={16} color="#fff" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold" style={{ letterSpacing: "-0.2px" }}>Mercado Pago conectado</div>
                <div className="text-[11px] text-ink-3 mt-[1px] truncate">
                  {initial?.mp_nickname || initial?.mp_email
                    ? `Cuenta: ${initial?.mp_nickname ?? ""}${initial?.mp_email ? ` · ${initial.mp_email}` : ""}`
                    : "Los cobros van directo a tu cuenta"}
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                className="press-fx text-[12px] font-medium text-danger flex-shrink-0"
                style={{ background: "transparent", border: 0, cursor: "pointer" }}
              >
                Desconectar
              </button>
            </div>
            {initial?.mp_test_account && (
              <div className="flex items-start gap-[8px] px-[14px] py-[10px] mt-[8px] rounded-[10px] text-[12px] leading-[1.5]" style={{ background: "rgba(196,90,60,0.10)", color: "var(--danger)" }}>
                <Icon name="alert" size={14} color="var(--danger)" className="flex-shrink-0 mt-[2px]" />
                <span>
                  Esta es una cuenta de <strong>PRUEBA</strong> de Mercado Pago: los
                  pagos reales van a fallar. Tocá «Desconectar», cerrá sesión de MP en
                  el navegador (o usá una ventana de incógnito) y volvé a conectar con
                  la cuenta real del negocio.
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-[12px] border border-line bg-surface p-[16px]">
            <p className="text-[13px] text-ink-2 leading-[1.5]">
              Conectá tu cuenta de Mercado Pago para cobrar señas a tus clientes.
              La plata entra <strong>directo a tu cuenta</strong>, sin comisiones nuestras.
            </p>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="press-fx w-full h-[48px] mt-[14px] rounded-[12px] flex items-center justify-center gap-[8px] text-white font-semibold text-[14px] disabled:opacity-70"
              style={{ background: MP_CYAN, border: 0, cursor: connecting ? "wait" : "pointer", fontFamily: "inherit" }}
            >
              {connecting ? "Abriendo Mercado Pago…" : "Conectar Mercado Pago"}
            </button>
          </div>
        )}

        {/* Opciones de pago */}
        <div>
          <div className="label-mono mb-[8px]">Opciones que ve el cliente al reservar</div>
          <div className="flex flex-col gap-[8px]">
            {/* Seña */}
            <div className="rounded-[12px] border border-line overflow-hidden">
              <div className="flex items-center gap-[12px] px-[14px] py-[12px]">
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium text-ink-1">Seña</div>
                  <div className="text-[11px] text-ink-3 mt-[1px]">Paga una parte para reservar</div>
                </div>
                <Switch checked={allowDeposit} onCheckedChange={(v) => setAllowDeposit(v)} />
              </div>
              {allowDeposit && (
                <div className="px-[14px] pb-[14px] flex flex-col gap-[10px] border-t border-line-2">
                  <div className="flex gap-[6px] mt-[12px]">
                    {(["percent", "fixed"] as const).map((t) => {
                      const on = depositType === t;
                      return (
                        <button
                          key={t}
                          onClick={() => setDepositType(t)}
                          className="press-fx flex-1 h-[38px] rounded-[10px] border text-[13px] font-medium text-ink-1"
                          style={{
                            borderColor: on ? "var(--ink-1)" : "var(--line)",
                            background: on ? "var(--line-2)" : "var(--surface)",
                            cursor: "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          {t === "percent" ? "Porcentaje" : "Monto fijo"}
                        </button>
                      );
                    })}
                  </div>
                  <div className="relative">
                    <input
                      value={value}
                      onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ""))}
                      inputMode="decimal"
                      placeholder={depositType === "percent" ? "30" : "2000"}
                      className="w-full h-[44px] border border-line bg-surface rounded-sm px-[14px] pr-[46px] text-[15px] text-ink-1 outline-none focus-visible:outline-[2px] focus-visible:outline-accent"
                      style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                    />
                    <span className="absolute right-[14px] top-1/2 -translate-y-1/2 text-[13px] text-ink-3 font-mono">
                      {depositType === "percent" ? "%" : currency}
                    </span>
                  </div>
                  {percentTooBig && (
                    <p className="text-[11px] text-danger leading-[1.4]">
                      Un porcentaje no puede ser mayor a 100. Si querés cobrar{" "}
                      <strong>{currency} {numValue.toLocaleString("es-AR")}</strong> de seña,
                      elegí «Monto fijo» arriba.
                    </p>
                  )}

                  {/* Seña obligatoria para clientes nuevos */}
                  <div className="flex items-center gap-[12px] pt-[2px]">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-ink-1">
                        Obligatoria para clientes nuevos
                      </div>
                      <div className="text-[11px] text-ink-3 mt-[2px] leading-[1.45]">
                        Los clientes nuevos solo pueden reservar pagando online.
                        Los que marques como frecuentes en Clientes reservan sin
                        pagar. Si no pagan en 30 min, el turno se libera solo.
                      </div>
                    </div>
                    <Switch checked={requireDeposit} onCheckedChange={setRequireDeposit} />
                  </div>
                </div>
              )}
            </div>

            {/* Pago completo */}
            <ToggleRow
              title="Pago completo"
              desc="El cliente paga el 100% al reservar"
              checked={allowFull}
              onChange={setAllowFull}
            />

            {/* Pagar en el local */}
            <ToggleRow
              title="Pagar en el local"
              desc="Reserva sin pagar online"
              checked={allowPayLater}
              onChange={setAllowPayLater}
            />
          </div>
        </div>

        {/* Avisos */}
        {!anyEnabled && (
          <p className="text-[11px] text-danger leading-[1.5]">
            Habilitá al menos una opción para que el cliente pueda reservar.
          </p>
        )}
        {!connected && (allowDeposit || allowFull) && (
          <p className="text-[11px] text-ink-3 leading-[1.5] flex items-start gap-[6px]">
            <Icon name="alert" size={13} color="var(--ink-3)" className="flex-shrink-0 mt-[1px]" />
            Para cobrar online necesitás conectar Mercado Pago arriba. Igual podés guardar la configuración.
          </p>
        )}

        {error && <p className="text-[12px] text-danger">{error}</p>}

        <Btn onClick={handleSave} loading={saving} disabled={!valid} size="lg" full className="mt-[2px]">
          {savedFlash ? "Guardado ✓" : "Guardar configuración"}
        </Btn>
      </div>
    </BottomSheet>
  );
}

function ToggleRow({
  title,
  desc,
  checked,
  onChange,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-[12px] px-[14px] py-[12px] rounded-[12px] border border-line">
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-medium text-ink-1">{title}</div>
        <div className="text-[11px] text-ink-3 mt-[1px]">{desc}</div>
      </div>
      <Switch checked={checked} onCheckedChange={(v) => onChange(v)} />
    </div>
  );
}

// ─── Sheet: Agenda inteligente (anti-fragmentación) ────────
function SmartAgendaSheet({ tenant, onClose, onSaved }: {
  tenant: Tenant;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [enabled, setEnabled] = useState(tenant.optimize_gaps ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/tenants/${tenant.id}`, { optimize_gaps: enabled });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
      setSaving(false);
    }
  };

  return (
    <BottomSheet open onClose={onClose} title="Agenda inteligente">
      <div className="flex flex-col gap-[14px]">
        <div className="flex items-center gap-[12px] px-[14px] py-[12px] rounded-[12px] border border-line">
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-medium text-ink-1">Optimizar huecos</div>
            <div className="text-[11px] text-ink-3 mt-[1px]">
              Evitá turnos que te parten el día
            </div>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="rounded-[12px] bg-line-2 px-[14px] py-[12px] text-[12px] text-ink-2 leading-[1.55]">
          <p>
            <strong>Cómo funciona:</strong> cuando está activado, a tus clientes
            solo se les ofrecen horarios que no dejan huecos muertos en tu agenda:
          </p>
          <ul className="mt-[8px] flex flex-col gap-[6px] list-disc pl-[16px]">
            <li>
              Un horario se ofrece si queda <strong>pegado a otro turno</strong>{" "}
              o al inicio/fin de tu jornada.
            </li>
            <li>
              También si el hueco que deja{" "}
              <strong>alcanza para tu servicio más corto</strong>, así otro
              cliente todavía puede tomarlo.
            </li>
          </ul>
          <p className="mt-[8px]">
            Ejemplo: trabajás de 8:00 a 11:30 y tu servicio dura 1h 30m → se
            ofrecen <strong>8:00 y 10:00</strong> (el 9:00 no, porque te dejaría
            1 hora muerta hasta el cierre). Si alguien reserva a las 8:00, el
            9:30 se habilita solo, porque queda pegado a ese turno.
          </p>
        </div>

        {error && <p className="text-[12px] text-danger">{error}</p>}
        <Btn onClick={handleSave} loading={saving} size="lg" full>
          Guardar
        </Btn>
      </div>
    </BottomSheet>
  );
}

// ─── Sheet: Zona horaria y moneda (región) ─────────────────
function RegionSheet({ tenant, onClose, onSaved }: {
  tenant: Tenant;
  onClose: () => void;
  onSaved: () => void;
}) {
  // Preseleccionar el país cuya zona coincide con la guardada. Si la zona actual
  // no está en la lista, arrancamos en Argentina pero mostramos la zona real.
  const current = countryByTimezone(tenant.timezone);
  const [code, setCode] = useState(current?.code ?? "AR");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = COUNTRY_OPTIONS.find((c) => c.code === code) ?? COUNTRY_OPTIONS[0];
  const dirty = selected.timezone !== tenant.timezone || selected.currency !== tenant.currency;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/tenants/${tenant.id}`, {
        timezone: selected.timezone,
        currency: selected.currency,
        locale: selected.locale,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open onClose={onClose} title="Zona horaria y moneda">
      <div className="flex flex-col gap-[14px]">
        <p className="text-[13px] text-ink-2 leading-[1.5]">
          Define el día y la hora de tu agenda y la moneda de los cobros. Elegí el
          país donde funciona tu negocio.
        </p>

        <div>
          <label className="block text-[12px] font-medium text-ink-2 mb-[6px]">País</label>
          <select
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full h-[44px] px-[12px] border border-line bg-surface rounded-sm text-[14px] text-ink-1 outline-none focus-visible:outline-[2px] focus-visible:outline-accent"
            style={{ fontFamily: "inherit" }}
          >
            {COUNTRY_OPTIONS.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label} · {c.currency}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-bg border border-line rounded-sm p-[12px] flex flex-col gap-[4px]">
          <div className="flex justify-between text-[12px]">
            <span className="text-ink-3">Zona horaria</span>
            <span className="font-mono text-ink-1">{selected.timezone}</span>
          </div>
          <div className="flex justify-between text-[12px]">
            <span className="text-ink-3">Moneda</span>
            <span className="font-mono text-ink-1">{selected.currency}</span>
          </div>
        </div>

        {!current && (
          <p className="text-[11px] text-ink-3 leading-[1.5] flex items-start gap-[6px]">
            <Icon name="alert" size={13} color="var(--ink-3)" className="flex-shrink-0 mt-[1px]" />
            Zona guardada actualmente: <span className="font-mono">{tenant.timezone}</span>
          </p>
        )}

        {error && <p className="text-[12px] text-danger">{error}</p>}
        <Btn onClick={handleSave} loading={saving} disabled={!dirty} size="lg" full className="mt-[6px]">
          Guardar cambios
        </Btn>
      </div>
    </BottomSheet>
  );
}

// ─── Main view ─────────────────────────────────────────────
type SheetType =
  | "info"
  | "logo"
  | "url"
  | "whatsapp"
  | "hours"
  | "reminders"
  | "policy"
  | "team"
  | "devices"
  | "payments"
  | "smartgrid"
  | "region"
  | null;

export function AjustesView({
  initialTenant,
  sessions: initialSessions,
  currentSessionId,
  initialPayments,
}: {
  initialTenant: Tenant;
  sessions: AdminSession[];
  currentSessionId: string;
  initialPayments: PaymentSettings | null;
}) {
  const router = useRouter();
  const [tenant, setTenant] = useState(initialTenant);
  const [sessions, setSessions] = useState(initialSessions);
  const [payments, setPayments] = useState(initialPayments);
  const [openSheet, setOpenSheet] = useState<SheetType>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [mpFlash, setMpFlash] = useState<"connected" | "error" | null>(null);

  // Al volver del OAuth de Mercado Pago, el back redirige con ?mp=connected|error.
  // Abrimos el sheet de cobros con el resultado y limpiamos el query de la URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mp = params.get("mp");
    if (mp === "connected" || mp === "error") {
      setMpFlash(mp);
      setOpenSheet("payments");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const initials = getInitials(tenant.name);
  const publicUrl = `${getFrontendDomain()}/${tenant.slug}`;

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
            <BrandMark initials={initials} imageUrl={tenant.logo_url} size={52} />
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
            title="Foto de perfil"
            subtitle={tenant.logo_url ? "Imagen cargada" : "Subí el logo de tu negocio"}
            onClick={() => setOpenSheet("logo")}
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
            icon="mapPin"
            title="Zona horaria y moneda"
            subtitle={`${countryByTimezone(tenant.timezone)?.label ?? tenant.timezone} · ${tenant.currency}`}
            onClick={() => setOpenSheet("region")}
          />
          <Divider />
          <SectionRow
            icon="clock"
            title="Horarios del negocio"
            subtitle="Configurá horarios por recurso"
            onClick={() => router.push("/admin/recursos")}
          />
          <Divider />
          <SectionRow
            icon="calendar"
            title="Agenda inteligente"
            subtitle={
              tenant.optimize_gaps
                ? "Optimizar huecos: activado"
                : "Solo ofrecer horarios sin huecos muertos"
            }
            onClick={() => setOpenSheet("smartgrid")}
          />
          <Divider />
          <SectionRow
            icon="lock"
            title="Bloqueos"
            subtitle="Feriados, vacaciones, franjas no disponibles"
            onClick={() => router.push("/admin/bloqueos")}
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

        {/* Grupo: Cobros */}
        <Group label="Cobros">
          <SectionRow
            icon="trending"
            title="Cobros y señas"
            subtitle={depositSummary(payments)}
            onClick={() => setOpenSheet("payments")}
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
            title="Dispositivos conectados"
            subtitle={`${sessions.length} ${sessions.length === 1 ? "sesión activa" : "sesiones activas"}`}
            onClick={() => setOpenSheet("devices")}
          />
          <Divider />
          <SectionRow
            icon="close"
            title="Cerrar sesión"
            danger
            onClick={async () => {
              if (confirm("¿Cerrar sesión? Vas a salir del panel y volver al login.")) {
                await logoutAction();
              }
            }}
          />
        </Group>

        {/* Footer */}
        <div className="text-center pt-[16px]">
          <div className="font-mono text-[10px] text-ink-3" style={{ letterSpacing: "0.05em" }}>
            Turno1Min · v1.0.0
          </div>
        </div>
      </div>

      {/* Sheets */}
      {openSheet === "info" && (
        <InfoSheet tenant={tenant} onClose={() => setOpenSheet(null)} onSaved={handleSaved} />
      )}
      {openSheet === "logo" && (
        <LogoSheet tenant={tenant} onClose={() => setOpenSheet(null)} onSaved={handleSaved} />
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
      {openSheet === "devices" && (
        <DevicesSheet
          sessions={sessions}
          currentSessionId={currentSessionId}
          onClose={() => setOpenSheet(null)}
          onChanged={setSessions}
        />
      )}
      {openSheet === "smartgrid" && (
        <SmartAgendaSheet tenant={tenant} onClose={() => setOpenSheet(null)} onSaved={handleSaved} />
      )}
      {openSheet === "region" && (
        <RegionSheet tenant={tenant} onClose={() => setOpenSheet(null)} onSaved={handleSaved} />
      )}
      {openSheet === "payments" && (
        <PaymentsSheet
          initial={payments}
          currency={tenant.currency}
          flash={mpFlash}
          onClose={() => {
            setMpFlash(null);
            setOpenSheet(null);
          }}
          onConfigSaved={(partial) =>
            setPayments((prev) =>
              prev ? { ...prev, ...partial } : prev,
            )
          }
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
