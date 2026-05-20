import { ImageResponse } from "next/og";
import { api } from "@/lib/api";
import type { Tenant } from "@/types/api";

export const alt = "Reservá tu turno online";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Cacheamos a nivel CDN: tenant data cambia poco, regeneramos cada hora.
export const revalidate = 3600;

// Tokens del design system (idénticos a globals.css).
const BG = "#fafaf7";
const SURFACE = "#ffffff";
const INK_1 = "#0f0f0e";
const INK_2 = "#52514d";
const INK_3 = "#8a8984";
const LINE = "#ebeae3";
const ACCENT = "#e8725a";

// woff2 latin de Google Fonts — subset que cubre español completo (ñ, á, é, í, ó, ú, ü).
const INSTRUMENT_SERIF_REGULAR =
  "https://fonts.gstatic.com/s/instrumentserif/v5/jizBRFtNs2ka5fXjeivQ4LroWlx-6zUTjg.woff2";
const INSTRUMENT_SERIF_ITALIC =
  "https://fonts.gstatic.com/s/instrumentserif/v5/jizHRFtNs2ka5fXjeivQ4LroWlx-6zAjjH7M.woff2";

async function fetchBuffer(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url, { cache: "force-cache" });
  return res.arrayBuffer();
}

function getInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "T1";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// Tamaño tipográfico adaptativo — nombres largos no rompen el layout.
function fitName(name: string): { text: string; size: number } {
  const n = name.trim();
  if (n.length <= 10) return { text: n, size: 148 };
  if (n.length <= 14) return { text: n, size: 124 };
  if (n.length <= 18) return { text: n, size: 104 };
  if (n.length <= 24) return { text: n, size: 84 };
  if (n.length <= 32) return { text: n, size: 68 };
  return { text: n.slice(0, 30).trimEnd() + "…", size: 64 };
}

export default async function OgImage({ params }: { params: { slug: string } }) {
  // Fetch en paralelo: fonts + tenant. La performance crítica es el primer share en WhatsApp.
  const [serifRegular, serifItalic, tenant] = await Promise.all([
    fetchBuffer(INSTRUMENT_SERIF_REGULAR),
    fetchBuffer(INSTRUMENT_SERIF_ITALIC),
    api.get<Tenant>(`/tenants/slug/${params.slug}`).catch(() => null),
  ]);

  const name = tenant?.name ?? "Reservá tu turno";
  const initials = tenant ? getInitials(tenant.name) : "T1";
  const fitted = fitName(name);
  const slug = params.slug;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: BG,
          padding: "60px 72px",
          fontFamily: '"Inter Tight", system-ui, sans-serif',
          position: "relative",
        }}
      >
        {/* ── Top bar: Turno1Min wordmark + /slug pill ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: INK_1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: '"Instrument Serif"',
                fontStyle: "italic",
                fontSize: 30,
                lineHeight: 1,
                paddingBottom: 4,
              }}
            >
              <span style={{ color: BG, display: "flex" }}>T</span>
              <span style={{ color: ACCENT, display: "flex", marginLeft: 1 }}>1</span>
            </div>
            <div
              style={{
                fontFamily: '"Instrument Serif"',
                fontSize: 24,
                color: INK_1,
                letterSpacing: "-0.4px",
                display: "flex",
              }}
            >
              <span>Turno</span>
              <span style={{ color: ACCENT, fontStyle: "italic" }}>1</span>
              <span>Min</span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: SURFACE,
              border: `1px solid ${LINE}`,
              borderRadius: 999,
              padding: "10px 20px",
              fontFamily: "ui-monospace, Menlo, monospace",
              fontSize: 18,
              color: INK_2,
              letterSpacing: "-0.2px",
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 99,
                background: ACCENT,
              }}
            />
            /{slug}
          </div>
        </div>

        {/* ── Hero: nombre del negocio + brand mark ── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 56,
            paddingTop: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minWidth: 0,
            }}
          >
            {/* Eyebrow */}
            <div
              style={{
                fontFamily: "ui-monospace, Menlo, monospace",
                fontSize: 14,
                color: INK_3,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                display: "flex",
                marginBottom: 18,
              }}
            >
              Reservá tu turno en
            </div>

            {/* Nombre del negocio */}
            <div
              style={{
                fontFamily: '"Instrument Serif"',
                fontSize: fitted.size,
                lineHeight: 0.98,
                letterSpacing: "-3px",
                color: INK_1,
                display: "flex",
              }}
            >
              {fitted.text}
            </div>

            {/* CTA serif */}
            <div
              style={{
                fontFamily: '"Instrument Serif"',
                fontSize: 40,
                marginTop: 28,
                color: INK_2,
                letterSpacing: "-0.8px",
                lineHeight: 1,
                display: "flex",
                alignItems: "baseline",
              }}
            >
              <span>en </span>
              <span style={{ color: ACCENT, fontStyle: "italic", marginLeft: 8 }}>
                segundos
              </span>
              <span style={{ color: ACCENT, marginLeft: 12 }}>→</span>
            </div>
          </div>

          {/* BrandMark XL — mismo formato que la landing (italic Instrument Serif) */}
          <div
            style={{
              width: 240,
              height: 240,
              borderRadius: 56,
              background: INK_1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: '"Instrument Serif"',
              fontStyle: "italic",
              fontSize: 140,
              lineHeight: 1,
              color: BG,
              letterSpacing: "-3px",
              paddingBottom: 10,
              flexShrink: 0,
              boxShadow:
                "0 30px 60px -20px rgba(15,15,14,0.18), 0 12px 24px -10px rgba(15,15,14,0.10)",
            }}
          >
            {initials}
          </div>
        </div>

        {/* ── Footer: URL + tagline ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 28,
            borderTop: `1px solid ${LINE}`,
            fontFamily: "ui-monospace, Menlo, monospace",
            fontSize: 16,
            color: INK_3,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          <span style={{ display: "flex" }}>turno1min.app/{slug}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ display: "flex" }}>Online</span>
            <div
              style={{
                width: 4,
                height: 4,
                borderRadius: 99,
                background: INK_3,
                opacity: 0.5,
              }}
            />
            <span style={{ display: "flex" }}>Sin esperas</span>
            <div
              style={{
                width: 4,
                height: 4,
                borderRadius: 99,
                background: INK_3,
                opacity: 0.5,
              }}
            />
            <span style={{ display: "flex" }}>Confirmación inmediata</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Instrument Serif", data: serifRegular, style: "normal", weight: 400 },
        { name: "Instrument Serif", data: serifItalic, style: "italic", weight: 400 },
      ],
    },
  );
}
