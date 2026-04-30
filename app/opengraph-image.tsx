import { ImageResponse } from "next/og";

async function loadFont() {
  const response = await fetch(
    "https://fonts.gstatic.com/s/instrumentserif/v13/jizYREVItHgc8qBvXZLDC6sJAPkjBltA.woff2"
  );
  return response.arrayBuffer();
}

export const dynamic = "force-dynamic";
export const alt = "Turno1Min · Tu agenda en 1 minuto";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  const fontData = await loadFont();
  // Tokens del design system (idénticos a globals.css)
  const BG = "#fafaf7";
  const SURFACE = "#ffffff";
  const INK_1 = "#0f0f0e";
  const INK_2 = "#52514d";
  const INK_3 = "#8a8984";
  const LINE = "#ebeae3";
  const ACCENT = "#e8725a";
  const CONFIRMED = "#3a7a5c";
  const CONFIRMED_BG = "#e6f2ea";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: BG,
          fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
          position: "relative",
        }}
      >
        {/* ─────────── Columna izquierda: claim ─────────── */}
        <div
          style={{
            width: 720,
            display: "flex",
            flexDirection: "column",
            padding: "80px 0 80px 80px",
            justifyContent: "space-between",
          }}
        >
          {/* Brand mark + wordmark */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: INK_1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: '"Instrument Serif"',
                fontStyle: "italic",
                fontSize: 38,
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
                fontSize: 30,
                color: INK_1,
                letterSpacing: "-0.5px",
                display: "flex",
              }}
            >
              <span>Turno</span>
              <span style={{ color: ACCENT, fontStyle: "italic" }}>1</span>
              <span>Min</span>
            </div>
          </div>

          {/* Hero claim */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontFamily: '"Instrument Serif"',
                fontSize: 108,
                lineHeight: 0.98,
                letterSpacing: "-3.5px",
                color: INK_1,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ display: "flex" }}>Tu agenda,</div>
              <div style={{ display: "flex" }}>
                <span>en </span>
                <span style={{ color: ACCENT, fontStyle: "italic" }}>1 minuto</span>
                <span>.</span>
              </div>
            </div>

            <div
              style={{
                fontSize: 26,
                color: INK_2,
                marginTop: 32,
                lineHeight: 1.4,
                letterSpacing: "-0.3px",
                maxWidth: 560,
                display: "flex",
              }}
            >
              Recibí reservas online sin apps, sin fricción.
              Tus clientes reservan en segundos.
            </div>
          </div>

          {/* Footer con URL */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontFamily: "ui-monospace, Menlo, monospace",
              fontSize: 16,
              color: INK_3,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            <span style={{ display: "flex" }}>turno1min.app</span>
            <div
              style={{
                width: 4,
                height: 4,
                borderRadius: 99,
                background: INK_3,
                opacity: 0.5,
              }}
            />
            <span style={{ display: "flex" }}>Probalo gratis</span>
          </div>
        </div>

        {/* ─────────── Columna derecha: mockup de la agenda ─────────── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `linear-gradient(180deg, ${BG} 0%, #f4f2ea 100%)`,
            borderLeft: `1px solid ${LINE}`,
            padding: "80px 60px",
            position: "relative",
          }}
        >
          {/* Card flotante: agenda del día */}
          <div
            style={{
              width: 380,
              background: SURFACE,
              borderRadius: 22,
              border: `1px solid ${LINE}`,
              boxShadow:
                "0 30px 60px -20px rgba(15,15,14,0.12), 0 12px 24px -10px rgba(15,15,14,0.08)",
              padding: 28,
              display: "flex",
              flexDirection: "column",
              gap: 20,
              transform: "rotate(-1.5deg)",
            }}
          >
            {/* Header del card */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div
                  style={{
                    fontFamily: "ui-monospace, Menlo, monospace",
                    fontSize: 11,
                    color: INK_3,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    display: "flex",
                  }}
                >
                  Agenda
                </div>
                <div
                  style={{
                    fontFamily: '"Instrument Serif"',
                    fontSize: 32,
                    color: INK_1,
                    letterSpacing: "-0.5px",
                    lineHeight: 1,
                    display: "flex",
                  }}
                >
                  Hoy
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: CONFIRMED_BG,
                  color: CONFIRMED,
                  padding: "5px 10px",
                  borderRadius: 99,
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "-0.1px",
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 99,
                    background: CONFIRMED,
                  }}
                />
                <span style={{ display: "flex" }}>8 turnos</span>
              </div>
            </div>

            {/* Lista de turnos */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { time: "10:00", svc: "Corte clásico", who: "Laura Méndez", hue: "#e8b89c", status: "confirmed" },
                { time: "10:30", svc: "Corte + barba", who: "Martín R.", hue: "#a8c8d4", status: "confirmed" },
                { time: "11:00", svc: "Diseño de cejas", who: "Julia P.", hue: "#e8b8c8", status: "pending" },
              ].map((s, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 16px",
                    background: BG,
                    borderRadius: 12,
                    borderLeft: `3px solid ${
                      s.status === "confirmed" ? CONFIRMED : "#c08a2e"
                    }`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "ui-monospace, Menlo, monospace",
                      fontSize: 14,
                      color: INK_1,
                      fontWeight: 600,
                      width: 48,
                      display: "flex",
                    }}
                  >
                    {s.time}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 14,
                        color: INK_1,
                        fontWeight: 500,
                        letterSpacing: "-0.2px",
                        display: "flex",
                      }}
                    >
                      {s.svc}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: INK_3,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 99,
                          background: s.hue,
                        }}
                      />
                      <span style={{ display: "flex" }}>{s.who}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer del card */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: 16,
                borderTop: `1px solid ${LINE}`,
                marginTop: 4
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  color: INK_2,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
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
                <span style={{ display: "flex" }}>Próximo en 42 min</span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: INK_3,
                  fontFamily: "ui-monospace, Menlo, monospace",
                  letterSpacing: "0.04em",
                  display: "flex",
                }}
              >
                +5 más
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Instrument Serif",
          data: fontData,
          style: "normal",
          weight: 400,
        },
      ],
    },
  );
}
