import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { api } from "@/lib/api";
import type { Tenant, Service } from "@/types/api";
import { BrandMark } from "@/components/ui/brand-mark";
import { Btn } from "@/components/ui/btn";
import { Icon } from "@/components/ui/icon";

interface Props {
  params: { slug: string };
}

async function getTenant(slug: string): Promise<Tenant | null> {
  try {
    return await api.get<Tenant>(`/tenants/slug/${slug}`);
  } catch {
    return null;
  }
}

async function getServices(tenantId: string): Promise<Service[]> {
  try {
    return await api.get<Service[]>(`/services?tenantId=${tenantId}`);
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tenant = await getTenant(params.slug);
  if (!tenant) return { title: "Negocio no encontrado" };

  const title = `${tenant.name} — Reservá tu turno`;
  const description =
    tenant.description ??
    `Reservá tu turno en ${tenant.name} online. Sin esperas, confirmación inmediata.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: tenant.name,
      locale: tenant.locale.replace("-", "_"),
      // images se rellena automáticamente por Next.js con opengraph-image.tsx
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

function formatPrice(price: number | null, locale: string, currency: string) {
  if (price == null) return null;
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
}

export default async function LandingPage({ params }: Props) {
  const tenant = await getTenant(params.slug);
  if (!tenant || !tenant.is_public) notFound();

  const services = await getServices(tenant.id);
  const activeServices = services.filter((s) => s.is_active);

  const initials = tenant.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-bg flex flex-col" style={{ maxWidth: 430, margin: "0 auto" }}>
      <div className="flex-1 overflow-y-auto overflow-x-hidden hide-scroll">

        {/* ── Hero ── */}
        <div className="px-[28px] pt-[28px] pb-[28px]">
          <div className="flex items-center gap-[14px]">
            <BrandMark initials={initials} size={52} />
            <div className="flex-1 min-w-0">
              <div className="text-[19px] font-semibold leading-[1.1]" style={{ letterSpacing: "-0.3px" }}>
                {tenant.name}
              </div>
              {tenant.description && (
                <div className="text-[13px] text-ink-2 mt-[3px] truncate">{tenant.description}</div>
              )}
            </div>
            {tenant.whatsapp_number && (
              <a
                href={`https://wa.me/${tenant.whatsapp_number.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="press-fx flex items-center justify-center w-[38px] h-[38px] rounded-full border border-line bg-surface"
                aria-label="Contactar por WhatsApp"
              >
                <Icon name="whatsapp" size={18} color="var(--ink-2)" />
              </a>
            )}
          </div>

          {/* Headline */}
          <div
            className="font-serif text-[44px] leading-[1] mt-[44px]"
            style={{ letterSpacing: "-0.5px" }}
          >
            Reserva tu turno en{" "}
            <em className="not-italic" style={{ color: "var(--accent)" }}>
              segundos
            </em>
            .
          </div>
          <div className="text-[15px] text-ink-2 mt-[16px] leading-[1.5]" style={{ maxWidth: 300 }}>
            Elegí el servicio, el día y la hora. Te confirmamos por WhatsApp.
          </div>

          {/* CTAs */}
          <div className="mt-[28px] flex flex-col gap-[10px]">
            <Link href={`/${params.slug}/reservar`} className="w-full">
              <Btn variant="primary" size="lg" full className="gap-2">
                Reservar turno
                <Icon name="forward" size={16} color="var(--bg)" />
              </Btn>
            </Link>
            <Link href={`/${params.slug}/mi-turno`} className="w-full">
              <Btn variant="secondary" size="lg" full>
                Ya tengo un turno
              </Btn>
            </Link>
          </div>
        </div>

        {/* ── Servicios ── */}
        {activeServices.length > 0 && (
          <div className="px-[28px] pb-[20px]">
            <SectionHead label="Servicios" count={activeServices.length} />
            <div className="mt-[14px] flex flex-col gap-[8px]">
              {activeServices.slice(0, 3).map((svc) => {
                const price = formatPrice(svc.price, tenant.locale, tenant.currency);
                return (
                  <div
                    key={svc.id}
                    className="bg-surface border border-line rounded flex items-center gap-[14px] px-[16px] py-[14px]"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[15px] font-medium" style={{ letterSpacing: "-0.2px" }}>
                        {svc.name}
                      </div>
                      <div className="font-mono text-[12px] text-ink-3 mt-[2px]">
                        {svc.duration_minutes} min
                        {svc.description && ` · ${svc.description}`}
                      </div>
                    </div>
                    {price && (
                      <div className="font-mono text-[13px] text-ink-2 font-medium flex-shrink-0">
                        {price}
                      </div>
                    )}
                  </div>
                );
              })}
              {activeServices.length > 3 && (
                <Link
                  href={`/${params.slug}/reservar`}
                  className="press-fx flex items-center gap-[6px] px-[4px] py-[12px] text-[13px] text-ink-2"
                >
                  Ver todos los servicios
                  <Icon name="forward" size={12} color="var(--ink-2)" />
                </Link>
              )}
            </div>
          </div>
        )}

        {/* ── Dirección ── */}
        {tenant.address && (
          <div className="px-[28px] pb-[20px]">
            <SectionHead label="Dirección" />
            <div className="mt-[14px] bg-surface border border-line rounded flex items-center gap-[12px] px-[16px] py-[14px]">
              <div className="w-[36px] h-[36px] rounded-[10px] bg-line-2 flex items-center justify-center flex-shrink-0">
                <Icon name="mapPin" size={18} color="var(--ink-2)" />
              </div>
              <div className="text-[14px]">{tenant.address}</div>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="px-[28px] pt-[32px] pb-[40px] text-center">
          <div className="label-mono">Gestionado por TurnosApp</div>
          <Link
            href={`/${params.slug}/mi-turno`}
            className="inline-block mt-[16px] text-[13px] text-ink-2 underline underline-offset-4"
          >
            Ver o cancelar mi turno
          </Link>
        </div>

      </div>
    </div>
  );
}

function SectionHead({ label, count }: { label: string; count?: number }) {
  return (
    <div className="flex items-baseline gap-[8px]">
      <span className="label-mono">{label}</span>
      {count !== undefined && (
        <span className="label-mono">· {count}</span>
      )}
    </div>
  );
}
