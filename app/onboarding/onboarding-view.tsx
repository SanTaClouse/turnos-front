"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { setTenantCookie } from "@/app/actions";
import { useOnboardingStore, type DraftService, type DraftResource } from "@/store/onboarding";
import type { Tenant, Service, Resource } from "@/types/api";
import { Btn } from "@/components/ui/btn";
import { Icon } from "@/components/ui/icon";
import { ResourceAvatar } from "@/components/ui/resource-avatar";

const HUE_OPTIONS = [24, 60, 140, 180, 220, 280, 340];
const STEPS = ["welcome", "business", "services", "resources", "hours", "link", "done"] as const;
const CATEGORIES = [
  "Barbería / Peluquería",
  "Spa",
  "Estética",
  "Consultorio",
  "Tatuajes",
  "Otro",
];
const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DAY_DOW = [1, 2, 3, 4, 5, 6, 0]; // mapeo UI → backend (0=domingo en backend)

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// ─── Animation helper ──────────────────────────────────────
function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

// ═══ STEPS ═════════════════════════════════════════════════

// 0 — Welcome
function WelcomeStep() {
  return (
    <FadeIn>
      <div className="text-center pt-[40px]">
        <div
          className="mx-auto mb-[24px] w-[72px] h-[72px] rounded-[20px] bg-ink-1 flex items-center justify-center font-serif italic text-bg"
          style={{ fontSize: 36, letterSpacing: "-1px" }}
        >
          T
        </div>
        <h1
          className="font-serif text-[36px] leading-[1.05] text-balance"
          style={{ letterSpacing: "-1px" }}
        >
          Bienvenido a<br />TurnosApp.
        </h1>
        <p
          className="text-[15px] text-ink-2 leading-[1.5] text-balance mt-[14px] mx-auto"
          style={{ maxWidth: 280 }}
        >
          En 5 minutos tu negocio va a estar online recibiendo reservas.
        </p>
      </div>
    </FadeIn>
  );
}

// 1 — Business
function BusinessStep() {
  const { businessName, category, whatsapp, address, set } = useOnboardingStore();
  const inputBase = "w-full h-[48px] px-[14px] border border-line bg-surface rounded-sm text-[15px] text-ink-1 outline-none focus-visible:outline-[2px] focus-visible:outline-accent";

  return (
    <FadeIn>
      <h1 className="font-serif text-[30px] leading-[1.1] text-balance" style={{ letterSpacing: "-0.6px" }}>
        Contanos de tu negocio
      </h1>
      <p className="text-[14px] text-ink-2 mt-[8px]">Esto es lo que van a ver tus clientes.</p>

      <div className="mt-[24px] flex flex-col gap-[14px]">
        <div>
          <label className="block text-[12px] font-medium text-ink-2 mb-[6px]">Nombre del negocio</label>
          <input
            value={businessName}
            onChange={(e) => set("businessName", e.target.value)}
            placeholder="Corte Moderno"
            className={inputBase}
            style={{ fontFamily: "inherit" }}
            autoFocus
          />
        </div>

        <div>
          <label className="block text-[12px] font-medium text-ink-2 mb-[6px]">Rubro</label>
          <div className="flex flex-wrap gap-[6px]">
            {CATEGORIES.map((c) => {
              const active = category === c;
              return (
                <button
                  key={c}
                  onClick={() => set("category", c)}
                  className="press-fx px-[14px] py-[8px] rounded-full text-[13px]"
                  style={{
                    background: active ? "var(--ink-1)" : "var(--surface)",
                    color: active ? "var(--bg)" : "var(--ink-1)",
                    border: `1px solid ${active ? "var(--ink-1)" : "var(--line)"}`,
                    fontFamily: "inherit",
                    cursor: "pointer",
                  }}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-[12px] font-medium text-ink-2 mb-[6px]">WhatsApp del negocio</label>
          <input
            value={whatsapp}
            onChange={(e) => set("whatsapp", e.target.value)}
            placeholder="+5491155552200"
            inputMode="tel"
            className="w-full h-[48px] px-[14px] border border-line bg-surface rounded-sm text-[14px] text-ink-1 font-mono outline-none focus-visible:outline-[2px] focus-visible:outline-accent"
            style={{ fontFamily: "var(--font-jetbrains-mono)" }}
          />
        </div>

        <div>
          <label className="block text-[12px] font-medium text-ink-2 mb-[6px]">
            Dirección <span className="font-mono text-[10px] text-ink-3">opcional</span>
          </label>
          <input
            value={address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="Av. Siempre Viva 742"
            className={inputBase}
            style={{ fontFamily: "inherit" }}
          />
        </div>
      </div>
    </FadeIn>
  );
}

// 2 — Services
function ServicesStep() {
  const { services, addService, updateService, removeService } = useOnboardingStore();

  return (
    <FadeIn>
      <h1 className="font-serif text-[30px] leading-[1.1]" style={{ letterSpacing: "-0.6px" }}>
        ¿Qué servicios ofrecés?
      </h1>
      <p className="text-[14px] text-ink-2 mt-[8px]">Empezá con 2 o 3, después podés agregar más.</p>

      <div className="mt-[24px] flex flex-col gap-[8px]">
        {services.map((s, i) => (
          <ServiceCard
            key={i}
            service={s}
            onChange={(patch) => updateService(i, patch)}
            onRemove={services.length > 1 ? () => removeService(i) : undefined}
          />
        ))}

        <button
          onClick={() =>
            addService({ name: "", duration_minutes: 30, price: null })
          }
          className="press-fx py-[14px] rounded text-[13px] font-medium text-ink-2 flex items-center justify-center gap-[6px]"
          style={{
            border: "1px dashed var(--line)",
            background: "transparent",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <Icon name="plus" size={14} color="var(--ink-2)" /> Agregar servicio
        </button>
      </div>
    </FadeIn>
  );
}

function ServiceCard({
  service,
  onChange,
  onRemove,
}: {
  service: DraftService;
  onChange: (patch: Partial<DraftService>) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="bg-surface border border-line rounded p-[14px]">
      <div className="flex items-center gap-[8px]">
        <input
          value={service.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Nombre del servicio"
          className="flex-1 bg-transparent text-[15px] font-medium outline-none p-0"
          style={{ fontFamily: "inherit", border: 0 }}
        />
        {onRemove && (
          <button
            onClick={onRemove}
            className="press-fx w-[28px] h-[28px] rounded-[6px] bg-line-2 flex items-center justify-center"
            style={{ border: 0, cursor: "pointer" }}
            aria-label="Quitar servicio"
          >
            <Icon name="close" size={12} color="var(--ink-2)" />
          </button>
        )}
      </div>
      <div className="flex gap-[8px] mt-[10px]">
        <div className="flex-1">
          <div className="font-mono text-[10px] text-ink-3 mb-[4px]">DURACIÓN</div>
          <div className="flex gap-[4px]">
            {[15, 30, 45, 60, 90].map((d) => {
              const active = service.duration_minutes === d;
              return (
                <button
                  key={d}
                  onClick={() => onChange({ duration_minutes: d })}
                  className="press-fx flex-1 h-[32px] rounded-[6px] text-[11px] font-medium font-mono"
                  style={{
                    background: active ? "var(--ink-1)" : "var(--bg)",
                    color: active ? "var(--bg)" : "var(--ink-1)",
                    border: `1px solid ${active ? "var(--ink-1)" : "var(--line)"}`,
                    cursor: "pointer",
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ width: 100 }}>
          <div className="font-mono text-[10px] text-ink-3 mb-[4px]">PRECIO</div>
          <div className="relative">
            <span className="absolute left-[10px] top-[8px] text-[13px] text-ink-3 font-mono">$</span>
            <input
              type="number"
              value={service.price ?? ""}
              onChange={(e) =>
                onChange({ price: e.target.value ? Number(e.target.value) : null })
              }
              placeholder="0"
              className="w-full h-[32px] pl-[20px] pr-[8px] border border-line bg-bg rounded-[6px] text-[12px] font-mono outline-none focus-visible:outline-[2px] focus-visible:outline-accent"
              style={{ fontFamily: "var(--font-jetbrains-mono)" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// 3 — Resources
function ResourcesStep() {
  const { resources, addResource, updateResource, removeResource } = useOnboardingStore();

  return (
    <FadeIn>
      <h1 className="font-serif text-[30px] leading-[1.1] text-balance" style={{ letterSpacing: "-0.6px" }}>
        ¿Trabajás solo o en equipo?
      </h1>
      <p className="text-[14px] text-ink-2 mt-[8px]">
        Un &quot;recurso&quot; es cada persona o silla que atiende turnos.
      </p>

      <div className="mt-[24px] flex flex-col gap-[8px]">
        {resources.map((r, i) => (
          <ResourceCard
            key={i}
            resource={r}
            onChange={(patch) => updateResource(i, patch)}
            onRemove={resources.length > 1 ? () => removeResource(i) : undefined}
          />
        ))}

        <button
          onClick={() => {
            const usedHues = new Set(resources.map((r) => r.hue));
            const nextHue = HUE_OPTIONS.find((h) => !usedHues.has(h)) ?? HUE_OPTIONS[0];
            addResource({ name: "", role: "", hue: nextHue });
          }}
          className="press-fx py-[14px] rounded text-[13px] font-medium text-ink-2 flex items-center justify-center gap-[6px]"
          style={{
            border: "1px dashed var(--line)",
            background: "transparent",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <Icon name="plus" size={14} color="var(--ink-2)" /> Agregar compañero
        </button>
      </div>
    </FadeIn>
  );
}

function ResourceCard({
  resource,
  onChange,
  onRemove,
}: {
  resource: DraftResource;
  onChange: (patch: Partial<DraftResource>) => void;
  onRemove?: () => void;
}) {
  const initials = (resource.name.trim() || "—")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="bg-surface border border-line rounded p-[12px_14px]">
      <div className="flex items-center gap-[12px]">
        <ResourceAvatar initials={initials} hue={resource.hue} size={40} />
        <div className="flex-1 flex flex-col gap-[4px]">
          <input
            value={resource.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Nombre"
            className="bg-transparent text-[15px] font-medium outline-none p-0"
            style={{ fontFamily: "inherit", border: 0 }}
          />
          <input
            value={resource.role ?? ""}
            onChange={(e) => onChange({ role: e.target.value })}
            placeholder="Rol (opcional)"
            className="bg-transparent text-[12px] text-ink-3 outline-none p-0"
            style={{ fontFamily: "inherit", border: 0 }}
          />
        </div>
        {onRemove && (
          <button
            onClick={onRemove}
            className="press-fx w-[28px] h-[28px] rounded-[6px] bg-line-2 flex items-center justify-center"
            style={{ border: 0, cursor: "pointer" }}
            aria-label="Quitar"
          >
            <Icon name="close" size={12} color="var(--ink-2)" />
          </button>
        )}
      </div>
      <div className="flex gap-[6px] mt-[10px] flex-wrap">
        {HUE_OPTIONS.map((h) => {
          const active = resource.hue === h;
          return (
            <button
              key={h}
              onClick={() => onChange({ hue: h })}
              className="press-fx w-[24px] h-[24px] rounded-full"
              style={{
                background: `oklch(0.78 0.08 ${h})`,
                outline: active ? "2px solid var(--ink-1)" : "none",
                outlineOffset: 1,
                border: 0,
                cursor: "pointer",
              }}
              aria-label={`Color ${h}`}
            />
          );
        })}
      </div>
    </div>
  );
}

// 4 — Hours
function HoursStep() {
  const { openHour, closeHour, workdays, set, toggleWorkday } = useOnboardingStore();

  return (
    <FadeIn>
      <h1 className="font-serif text-[30px] leading-[1.1]" style={{ letterSpacing: "-0.6px" }}>
        ¿Cuándo atendés?
      </h1>
      <p className="text-[14px] text-ink-2 mt-[8px]">
        Después podés ajustar cada día por separado.
      </p>

      <div className="mt-[24px] flex gap-[10px]">
        <div className="flex-1">
          <label className="block text-[12px] font-medium text-ink-2 mb-[6px]">Abre</label>
          <input
            type="time"
            value={openHour}
            onChange={(e) => set("openHour", e.target.value)}
            className="w-full h-[48px] px-[14px] border border-line bg-surface rounded-sm text-[16px] font-mono outline-none focus-visible:outline-[2px] focus-visible:outline-accent"
            style={{ fontFamily: "var(--font-jetbrains-mono)" }}
          />
        </div>
        <div className="flex-1">
          <label className="block text-[12px] font-medium text-ink-2 mb-[6px]">Cierra</label>
          <input
            type="time"
            value={closeHour}
            onChange={(e) => set("closeHour", e.target.value)}
            className="w-full h-[48px] px-[14px] border border-line bg-surface rounded-sm text-[16px] font-mono outline-none focus-visible:outline-[2px] focus-visible:outline-accent"
            style={{ fontFamily: "var(--font-jetbrains-mono)" }}
          />
        </div>
      </div>

      <div className="mt-[18px]">
        <label className="block text-[12px] font-medium text-ink-2 mb-[8px]">Días de atención</label>
        <div className="flex gap-[6px] flex-wrap">
          {DAY_LABELS.map((label, i) => {
            const dow = DAY_DOW[i];
            const active = workdays.includes(dow);
            return (
              <button
                key={label}
                onClick={() => toggleWorkday(dow)}
                className="press-fx w-[40px] h-[40px] rounded-[10px] text-[12px] font-medium"
                style={{
                  background: active ? "var(--ink-1)" : "var(--surface)",
                  color: active ? "var(--bg)" : "var(--ink-3)",
                  border: `1px solid ${active ? "var(--ink-1)" : "var(--line)"}`,
                  fontFamily: "inherit",
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </FadeIn>
  );
}

// 5 — Link
function LinkStep() {
  const { businessName, slug, set } = useOnboardingStore();

  // Auto-sugerir slug del nombre del negocio si está vacío
  useEffect(() => {
    if (!slug && businessName) {
      set("slug", slugify(businessName));
    }
  }, [businessName, slug, set]);

  return (
    <FadeIn>
      <h1 className="font-serif text-[30px] leading-[1.1]" style={{ letterSpacing: "-0.6px" }}>
        Tu link único
      </h1>
      <p className="text-[14px] text-ink-2 mt-[8px]">Es donde tus clientes van a reservar.</p>

      <div className="mt-[24px]">
        <div className="bg-surface border border-line rounded p-[18px_16px]">
          <div className="font-mono text-[11px] text-ink-3" style={{ letterSpacing: "0.05em" }}>
            {process.env.FRONT_SHORT}
          </div>
          <input
            value={slug}
            onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            placeholder="mi-negocio"
            className="w-full bg-transparent border-0 outline-none mt-[2px] font-mono text-[18px] font-medium text-ink-1 p-0"
            style={{ fontFamily: "var(--font-jetbrains-mono)", letterSpacing: "-0.3px" }}
          />
        </div>
        <p className="text-[12px] text-ink-3 mt-[10px] leading-[1.5]">
          Compartilo por WhatsApp, Instagram, Google Maps, donde quieras. Solo letras minúsculas, números y guiones.
        </p>
      </div>
    </FadeIn>
  );
}

// 6 — Done
function DoneStep() {
  const { businessName, slug } = useOnboardingStore();
  const [copied, setCopied] = useState(false);
  const publicUrl = `turnosapp.com/${slug}`;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* silently */ }
  };

  return (
    <FadeIn>
      <div className="text-center pt-[40px]">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 25 }}
          className="mx-auto mb-[24px] w-[88px] h-[88px] rounded-full flex items-center justify-center"
          style={{ background: "var(--status-confirmed-bg)" }}
        >
          <Icon name="check" size={40} color="var(--status-confirmed)" strokeWidth={3} />
        </motion.div>

        <h1
          className="font-serif text-[34px] leading-[1.05] text-balance"
          style={{ letterSpacing: "-0.8px" }}
        >
          {businessName || "Tu negocio"}<br />está en línea.
        </h1>
        <p
          className="text-[15px] text-ink-2 mt-[14px] leading-[1.5] text-balance mx-auto"
          style={{ maxWidth: 280 }}
        >
          Compartí tu link y empezá a recibir reservas.
        </p>

        <div className="bg-surface border border-line rounded p-[14px_18px] mt-[28px] text-left">
          <div className="font-mono text-[10px] text-ink-3" style={{ letterSpacing: "0.05em" }}>
            TU LINK
          </div>
          <div className="flex items-center gap-[8px] mt-[4px]">
            <span className="font-mono text-[14px] text-ink-1 flex-1 truncate">{publicUrl}</span>
            <button
              onClick={() => copy(`https://${publicUrl}`)}
              className="press-fx flex items-center gap-[4px] text-[12px] text-ink-2 px-[8px] py-[4px] rounded-[6px] bg-line-2"
              style={{ border: 0, cursor: "pointer", fontFamily: "inherit" }}
            >
              <Icon name={copied ? "check" : "copy"} size={12} color="var(--ink-2)" />
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>
      </div>
    </FadeIn>
  );
}

// ═══ MAIN WIZARD ═══════════════════════════════════════════
export function OnboardingWizard() {
  const router = useRouter();
  const store = useOnboardingStore();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const stepKey = STEPS[store.step];
  const isLast = stepKey === "done";
  const isFirst = stepKey === "welcome";
  const showProgress = !isFirst && !isLast;

  // Validaciones por paso para habilitar "Continuar"
  const canContinue = (() => {
    switch (stepKey) {
      case "welcome":
        return true;
      case "business":
        return (
          store.businessName.trim().length >= 2 &&
          store.whatsapp.replace(/\D/g, "").length >= 8
        );
      case "services":
        return (
          store.services.length > 0 &&
          store.services.every((s) => s.name.trim().length >= 2 && s.duration_minutes > 0)
        );
      case "resources":
        return (
          store.resources.length > 0 &&
          store.resources.every((r) => r.name.trim().length >= 2)
        );
      case "hours":
        return store.workdays.length > 0 && store.openHour < store.closeHour;
      case "link":
        return /^[a-z0-9-]{3,60}$/.test(store.slug);
      default:
        return true;
    }
  })();

  // Paso final: crear todo en el backend
  const handlePublish = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      // 1. Tenant
      const tenant = await api.post<Tenant>("/tenants", {
        name: store.businessName.trim(),
        slug: store.slug,
        whatsapp_number: store.whatsapp,
        address: store.address.trim() || undefined,
        timezone: "America/Argentina/Buenos_Aires",
        currency: "ARS",
        locale: "es-AR",
        is_public: true,
      });

      // 2. Servicios
      const createdServices: Service[] = [];
      for (const s of store.services) {
        const svc = await api.post<Service>("/services", {
          tenant_id: tenant.id,
          name: s.name.trim(),
          duration_minutes: s.duration_minutes,
          buffer_minutes: 0,
          price: s.price ?? undefined,
        });
        createdServices.push(svc);
      }

      // 3. Recursos (asignándoles TODOS los servicios por default)
      const createdResources: Resource[] = [];
      for (const r of store.resources) {
        const res = await api.post<Resource>("/resources", {
          tenant_id: tenant.id,
          name: r.name.trim(),
          role: r.role?.trim() || undefined,
          hue: r.hue,
          service_ids: createdServices.map((s) => s.id),
        });
        createdResources.push(res);
      }

      // 4. Disponibilidad: por cada (recurso, día) crear regla
      for (const res of createdResources) {
        for (const dow of store.workdays) {
          await api.post("/availability", {
            tenant_id: tenant.id,
            resource_id: res.id,
            day_of_week: dow,
            start_time: store.openHour,
            end_time: store.closeHour,
            slot_duration: 30,
          });
        }
      }

      // Sesión: setear cookie con el tenantId del nuevo negocio
      await setTenantCookie(tenant.id);

      store.set("createdTenantId", tenant.id);
      store.next(); // → done
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : "No se pudo publicar el negocio. Revisá los datos.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinish = () => {
    store.reset();
    router.push("/admin/agenda");
  };

  return (
    <div
      className="min-h-screen bg-bg flex flex-col"
      style={{ height: "100dvh", maxWidth: 430, margin: "0 auto" }}
    >
      {/* Top bar con progreso */}
      {showProgress && (
        <div className="flex-shrink-0 px-[20px] pt-[8px] pb-[4px] flex items-center gap-[10px]">
          <button
            onClick={() => store.prev()}
            className="press-fx w-[36px] h-[36px] rounded-full border border-line bg-surface flex items-center justify-center flex-shrink-0"
            aria-label="Atrás"
            style={{ cursor: "pointer" }}
          >
            <Icon name="back" size={14} color="var(--ink-1)" />
          </button>
          <div className="flex-1 flex gap-[4px]">
            {STEPS.slice(1, -1).map((_, i) => (
              <div
                key={i}
                className="flex-1 h-[3px] rounded-[2px] transition-colors"
                style={{
                  background: i < store.step ? "var(--ink-1)" : "var(--line)",
                }}
              />
            ))}
          </div>
          <div className="font-mono text-[10px] text-ink-3 flex-shrink-0">
            {store.step}/{STEPS.length - 2}
          </div>
        </div>
      )}

      {/* Contenido scrolleable */}
      <div className="flex-1 overflow-y-auto hide-scroll px-[24px] py-[24px]">
        <AnimatePresence mode="wait">
          <motion.div key={stepKey}>
            {stepKey === "welcome" && <WelcomeStep />}
            {stepKey === "business" && <BusinessStep />}
            {stepKey === "services" && <ServicesStep />}
            {stepKey === "resources" && <ResourcesStep />}
            {stepKey === "hours" && <HoursStep />}
            {stepKey === "link" && <LinkStep />}
            {stepKey === "done" && <DoneStep />}
          </motion.div>
        </AnimatePresence>

        {submitError && (
          <p className="text-[12px] text-danger text-center mt-[16px]">{submitError}</p>
        )}
      </div>

      {/* CTA inferior */}
      <div className="flex-shrink-0 px-[24px] pt-[12px] pb-[28px]">
        {stepKey === "welcome" && (
          <Btn onClick={() => store.next()} size="lg" full>
            Comenzar
          </Btn>
        )}
        {stepKey !== "welcome" && stepKey !== "link" && stepKey !== "done" && (
          <Btn onClick={() => store.next()} disabled={!canContinue} size="lg" full>
            Continuar
          </Btn>
        )}
        {stepKey === "link" && (
          <Btn
            onClick={handlePublish}
            loading={submitting}
            disabled={!canContinue}
            size="lg"
            full
          >
            Publicar mi negocio
          </Btn>
        )}
        {stepKey === "done" && (
          <Btn onClick={handleFinish} size="lg" full>
            Ir a la agenda
          </Btn>
        )}
      </div>
    </div>
  );
}
