import { ImageResponse } from "next/og";
import { api } from "@/lib/api";
import type { Tenant } from "@/types/api";

export const alt = "Reservá tu turno online";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default async function OgImage({ params }: { params: { slug: string } }) {
  let tenant: Tenant | null = null;
  try {
    tenant = await api.get<Tenant>(`/tenants/slug/${params.slug}`);
  } catch {
    // tenant no existe → fallback genérico
  }

  const name = tenant?.name ?? "Reservá tu turno";
  const subtitle = tenant?.description ?? tenant?.address ?? "Reservá online en segundos";
  const initials = tenant ? getInitials(tenant.name) : "✓";
  const slug = params.slug;

  // Tokens del design system (inline porque next/og no soporta CSS custom props)
  const BG = "#fafaf7";
  const SURFACE = "#ffffff";
  const INK_1 = "#0f0f0e";
  const INK_2 = "#52514d";
  const INK_3 = "#8a8984";
  const LINE = "#ebeae3";
  const ACCENT = "#e8725a";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: BG,
          padding: "80px 96px",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Top: BrandMark + slug */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 34,
              background: INK_1,
              color: BG,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Georgia, serif",
              fontStyle: "italic",
              fontSize: 60,
              letterSpacing: "-2px",
            }}
          >
            {initials}
          </div>

          {/* Pill: dominio público */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: SURFACE,
              border: `1px solid ${LINE}`,
              borderRadius: 999,
              padding: "14px 22px",
              fontFamily: "ui-monospace, Menlo, monospace",
              fontSize: 22,
              color: INK_2,
              letterSpacing: "-0.3px",
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: ACCENT,
              }}
            />
            /{slug}
          </div>
        </div>

        {/* Middle: nombre + tagline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            paddingTop: 40,
          }}
        >
          <div
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 96,
              lineHeight: 1.05,
              letterSpacing: "-3px",
              color: INK_1,
              maxWidth: "100%",
              display: "flex",
            }}
          >
            {name.length > 28 ? name.slice(0, 26) + "…" : name}
          </div>
          <div
            style={{
              fontSize: 32,
              color: INK_2,
              marginTop: 24,
              lineHeight: 1.4,
              letterSpacing: "-0.5px",
              maxWidth: 900,
              display: "flex",
            }}
          >
            {subtitle.length > 90 ? subtitle.slice(0, 88) + "…" : subtitle}
          </div>
        </div>

        {/* Bottom: CTA pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginTop: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              background: INK_1,
              color: BG,
              borderRadius: 18,
              padding: "22px 32px",
              fontSize: 28,
              fontWeight: 500,
              letterSpacing: "-0.5px",
            }}
          >
            Reservá tu turno
            <div style={{ fontSize: 26, color: ACCENT }}>→</div>
          </div>
          <div
            style={{
              fontSize: 18,
              color: INK_3,
              letterSpacing: "-0.2px",
              display: "flex",
            }}
          >
            Online · Sin esperas · Confirmación inmediata
          </div>
        </div>
      </div>
    ),
    size,
  );
}
