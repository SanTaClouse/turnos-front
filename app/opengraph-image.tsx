import { ImageResponse } from "next/og";

// force-dynamic evita el prerender en build (que rompe en Windows con paths con espacios).
// La imagen se genera on-demand cuando alguien la requiere.
export const dynamic = "force-dynamic";
export const alt = "Reservá turnos online sin complicaciones";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  // Tokens del design system
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
          padding: "96px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        {/* Top: dots ornamentales */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: ACCENT,
            }}
          />
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: INK_1,
              opacity: 0.15,
            }}
          />
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: INK_1,
              opacity: 0.15,
            }}
          />
        </div>

        {/* Hero: titular grande + descripción */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            paddingTop: 60,
          }}
        >
          <div
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 110,
              lineHeight: 1.02,
              letterSpacing: "-4px",
              color: INK_1,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex" }}>Reservá tu turno</div>
            <div style={{ display: "flex" }}>
              en <span style={{ color: ACCENT, fontStyle: "italic", marginLeft: 18 }}>segundos</span>.
            </div>
          </div>
          <div
            style={{
              fontSize: 30,
              color: INK_2,
              marginTop: 36,
              lineHeight: 1.4,
              letterSpacing: "-0.4px",
              maxWidth: 900,
              display: "flex",
            }}
          >
            Sin apps, sin esperas. Confirmación inmediata por email.
          </div>
        </div>

        {/* Bottom: tarjetas con ejemplos de turnos */}
        <div
          style={{
            display: "flex",
            gap: 14,
            marginTop: "auto",
          }}
        >
          {[
            { time: "10:00", svc: "Corte", who: "Carlos", color: "#e8b89c" },
            { time: "10:30", svc: "Corte + barba", who: "Martín", color: "#a8c8d4" },
            { time: "11:00", svc: "Diseño cejas", who: "Julia", color: "#e8b8c8" },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                background: SURFACE,
                border: `1px solid ${LINE}`,
                borderLeft: `4px solid ${i === 0 ? "#3a7a5c" : "#c08a2e"}`,
                borderRadius: 14,
                padding: "20px 22px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div
                style={{
                  fontFamily: "ui-monospace, Menlo, monospace",
                  fontSize: 22,
                  color: INK_1,
                  fontWeight: 600,
                  letterSpacing: "-0.5px",
                  display: "flex",
                }}
              >
                {s.time}
              </div>
              <div style={{ fontSize: 20, color: INK_1, fontWeight: 500, display: "flex" }}>
                {s.svc}
              </div>
              <div
                style={{
                  fontSize: 16,
                  color: INK_3,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 999,
                    background: s.color,
                  }}
                />
                con {s.who}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
