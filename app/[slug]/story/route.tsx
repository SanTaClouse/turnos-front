import { ImageResponse } from "next/og";
import { api } from "@/lib/api";
import { loadInstrumentSerif, loadInterTight } from "@/lib/og-fonts";
import { todayInTimezone, addDays } from "@/lib/timezone-utils";
import type { Tenant } from "@/types/api";

// La disponibilidad cambia con cada reserva: una historia con horarios rancios
// manda clientes a un turno que ya no existe. Nunca cachear.
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Formato de historia de Instagram/WhatsApp.
const W = 1080;
const H = 1920;

// Instagram tapa ~250px arriba (avatar/nombre) y ~250px abajo (barra de
// respuesta). Todo lo legible tiene que vivir entre medio.
const SAFE_TOP = 210;
const SAFE_BOTTOM = 230;

// Tokens del design system (idénticos a globals.css).
const BG = "#fafaf7";
const SURFACE = "#ffffff";
const INK_1 = "#0f0f0e";
const INK_2 = "#52514d";
const INK_3 = "#8a8984";
const LINE = "#ebeae3";
const ACCENT = "#e8725a";

// Entran 4 chips por fila. 8 = dos filas llenas, que es el máximo que se lee
// de un vistazo desde el feed.
const MAX_SLOTS_PER_DAY = 8;

/**
 * Qué chips mostrar y cuántos quedan afuera.
 *
 * Si con el badge "+N más" se pasa de dos filas, mostramos 7 para que el badge
 * entre al final de la segunda; un "+1 más" solo en una tercera fila parece un
 * error de maquetado. Y si sobra exactamente uno, es mejor mostrarlo que
 * anunciarlo.
 */
function splitSlots(slots: string[]): { shown: string[]; rest: number } {
  if (slots.length <= MAX_SLOTS_PER_DAY) return { shown: slots, rest: 0 };
  const shown = slots.slice(0, MAX_SLOTS_PER_DAY - 1);
  return { shown, rest: slots.length - shown.length };
}

interface FreeSlots {
  resourceId: string;
  name: string;
  hue: number;
  slots: string[];
}

/** Tamaño del nombre según largo — nombres largos no rompen el layout. */
function fitName(name: string): { text: string; size: number } {
  const n = name.trim();
  if (n.length <= 12) return { text: n, size: 96 };
  if (n.length <= 18) return { text: n, size: 76 };
  if (n.length <= 26) return { text: n, size: 60 };
  return { text: n.slice(0, 26).trimEnd() + "…", size: 60 };
}

/**
 * Une los horarios de todos los profesionales en una sola lista.
 *
 * Al cliente que mira la historia no le sirve saber de quién es el hueco: le
 * sirve saber a qué hora puede ir. Si dos profesionales tienen libre las 10:00,
 * es UN horario reservable, no dos.
 */
function mergeSlots(free: FreeSlots[]): string[] {
  return Array.from(new Set(free.flatMap((r) => r.slots))).sort();
}

async function getDaySlots(tenantId: string, date: string): Promise<string[]> {
  const free = await api
    .get<FreeSlots[]>(`/availability/free?tenantId=${tenantId}&date=${date}`)
    .catch(() => [] as FreeSlots[]);
  return mergeSlots(free);
}

function DayCard({ label, slots }: { label: string; slots: string[] }) {
  const { shown, rest } = splitSlots(slots);
  const empty = shown.length === 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: SURFACE,
        border: `2px solid ${LINE}`,
        borderRadius: 36,
        padding: empty ? "36px 40px" : "36px 40px 42px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: empty ? 20 : 30,
        }}
      >
        <div style={{ width: 13, height: 13, borderRadius: 99, background: ACCENT }} />
        <div
          style={{
            display: "flex",
            fontSize: 27,
            fontWeight: 600,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: INK_2,
          }}
        >
          {label}
        </div>
      </div>

      {empty ? (
        <div style={{ display: "flex", fontSize: 36, color: INK_3 }}>
          Sin horarios libres
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
          {shown.map((slot) => (
            <div
              key={slot}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: BG,
                border: `2px solid ${LINE}`,
                borderRadius: 999,
                // Tabular-ish: mismo alto de caja para todos los chips, así la
                // grilla se lee como una grilla y no como texto suelto.
                padding: "18px 34px",
                fontSize: 50,
                fontWeight: 600,
                color: INK_1,
                letterSpacing: "-1.5px",
              }}
            >
              {slot}
            </div>
          ))}
          {rest > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "18px 20px",
                fontSize: 36,
                color: INK_3,
                letterSpacing: "-0.5px",
              }}
            >
              +{rest} más
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } },
) {
  const [fonts, inter, tenant] = await Promise.all([
    loadInstrumentSerif(),
    loadInterTight(),
    api.get<Tenant>(`/tenants/slug/${params.slug}`).catch(() => null),
  ]);

  if (!tenant) {
    return new Response("Negocio no encontrado", { status: 404 });
  }

  // "Hoy" y "mañana" en la timezone del NEGOCIO, no la del server ni la del
  // teléfono: un tenant en Buenos Aires no puede ver "hoy" según UTC.
  const today = todayInTimezone(tenant.timezone);
  const tomorrow = addDays(today, 1);

  const [todaySlots, tomorrowSlots] = await Promise.all([
    getDaySlots(tenant.id, today),
    getDaySlots(tenant.id, tomorrow),
  ]);

  const fitted = fitName(tenant.name);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: BG,
          padding: `${SAFE_TOP}px 64px ${SAFE_BOTTOM}px`,
          fontFamily: '"Inter Tight", system-ui, sans-serif',
        }}
      >
        {/* ── Encabezado: negocio + qué es esto ── */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 25,
              fontWeight: 600,
              color: INK_3,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              marginBottom: 20,
            }}
          >
            Turnos libres
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: '"Instrument Serif"',
              fontSize: fitted.size,
              lineHeight: 1,
              letterSpacing: "-2px",
              color: INK_1,
            }}
          >
            {fitted.text}
          </div>
        </div>

        {/* ── Grilla: hoy y mañana ──
            flex:1 + center reparte el aire sobrante arriba y abajo de la
            grilla en vez de dejar un hueco muerto entre ella y el sticker. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            gap: 26,
            marginTop: 40,
          }}
        >
          <DayCard label="Hoy" slots={todaySlots} />
          <DayCard label="Mañana" slots={tomorrowSlots} />
        </div>

        {/* ── Zona del sticker de link ──
            Instagram no deja pre-cargar el link sticker desde la web: lo pega
            el dueño a mano. Este recuadro le marca dónde, y así el sticker no
            tapa los horarios. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: 40,
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: '"Instrument Serif"',
              fontSize: 44,
              color: INK_2,
              letterSpacing: "-0.8px",
              marginBottom: 18,
            }}
          >
            <span>Reservá </span>
            <span style={{ color: ACCENT, fontStyle: "italic", marginLeft: 10 }}>
              acá abajo
            </span>
            <span style={{ color: ACCENT, marginLeft: 12 }}>↓</span>
          </div>

          <div
            style={{
              display: "flex",
              width: 620,
              height: 116,
              border: `3px dashed ${LINE}`,
              borderRadius: 24,
            }}
          />
        </div>

        {/* ── Footer: marca + link tipeable ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 44,
            paddingTop: 30,
            borderTop: `2px solid ${LINE}`,
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
                display: "flex",
                fontFamily: '"Instrument Serif"',
                fontSize: 30,
                color: INK_1,
                letterSpacing: "-0.4px",
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
              fontSize: 27,
              fontWeight: 600,
              color: INK_2,
              letterSpacing: "-0.3px",
            }}
          >
            turno1min.app/{tenant.slug}
          </div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      // El sheet lo lee para avisarle al dueño que la historia saldría vacía
      // antes de que la publique. La imagen sola no permite saberlo.
      headers: {
        "x-slots-total": String(todaySlots.length + tomorrowSlots.length),
      },
      fonts: [
        // Inter Tight primero: es la fuente por defecto del contenedor, y sin
        // ella los horarios caen al fallback serif de Satori.
        { name: "Inter Tight", data: inter.regular, style: "normal", weight: 400 },
        ...(inter.semibold
          ? [
              {
                name: "Inter Tight" as const,
                data: inter.semibold,
                style: "normal" as const,
                weight: 600 as const,
              },
            ]
          : []),
        { name: "Instrument Serif", data: fonts.regular, style: "normal", weight: 400 },
        ...(fonts.italic
          ? [
              {
                name: "Instrument Serif" as const,
                data: fonts.italic,
                style: "italic" as const,
                weight: 400 as const,
              },
            ]
          : []),
      ],
    },
  );
}
