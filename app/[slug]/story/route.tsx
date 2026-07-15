import { ImageResponse } from "next/og";
import { api } from "@/lib/api";
import { getFrontendDomain } from "@/lib/config";
import { loadInstrumentSerif, loadInterTight } from "@/lib/og-fonts";
import { todayInTimezone } from "@/lib/timezone-utils";
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
const SAFE_TOP = 200;
const SAFE_BOTTOM = 220;

// Tokens del design system (idénticos a globals.css).
const BG = "#fafaf7";
const SURFACE = "#ffffff";
const INK_1 = "#0f0f0e";
const INK_2 = "#52514d";
const INK_3 = "#8a8984";
const LINE = "#ebeae3";
const LINE_2 = "#f4f3ee";
const ACCENT = "#e8725a";

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

interface DaySlot {
  time: string;
  free: boolean;
}

/** Tamaño del nombre según largo — nombres largos no rompen el layout. */
function fitName(name: string): { text: string; size: number } {
  const n = name.trim();
  if (n.length <= 12) return { text: n, size: 88 };
  if (n.length <= 18) return { text: n, size: 70 };
  if (n.length <= 26) return { text: n, size: 56 };
  return { text: n.slice(0, 26).trimEnd() + "…", size: 56 };
}

/** "Hoy", "Mañana" o "Viernes 17 de julio". */
function dayLabel(date: string, today: string): string {
  const [y, m, d] = date.split("-").map(Number);
  // Mediodía UTC: evita que el cambio de huso corra el día uno para atrás.
  const dow = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
  const full = `${DAYS[dow]} ${d} de ${MONTHS[m - 1]}`;

  if (date === today) return `Hoy · ${full}`;
  return full;
}

/**
 * Alto reservado para la grilla, en px, dentro de la zona segura.
 *
 * Es 1920 − padding vertical (200+220) − encabezado (~190, con el nombre en su
 * tamaño más grande) − bloque del sticker (~217) − footer (~114) − el margen
 * superior de la grilla (36). Conservador a propósito: si la grilla se pasa,
 * flexbox la desborda por arriba Y por abajo, tapando la fecha y el sticker.
 */
const GRID_HEIGHT = 920;

/** Borde de SlotRow, arriba + abajo. Suma al alto de cada fila. */
const ROW_BORDER = 4;

/** Factor de caja de texto de Inter Tight (line-height por defecto de Satori). */
const LINE_HEIGHT = 1.2;

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/**
 * Cómo dibujar la grilla según cuántos slots tenga la jornada.
 *
 * Una agenda con slots de 30min da 20 filas; una de servicios de 2h da 4. La
 * misma métrica no sirve para las dos, y no se puede recortar con un "+N más"
 * porque justo esconde turnos reservables. Así que en vez de números mágicos
 * por tramo, derivamos el tamaño del espacio real: se elige la cantidad de
 * columnas, y de ahí sale el alto máximo por fila que garantiza que entren
 * todas.
 *
 * La relación alto/fuente sale del propio SlotRow:
 *   alto = 2*padding + 2*borde + caja del texto (1.2 × fontSize)
 * Olvidar el borde acá deja las filas de los extremos recortadas.
 */
function gridMetrics(count: number): {
  columns: number;
  fontSize: number;
  rowPadding: number;
  gap: number;
} {
  const columns = count <= 10 ? 1 : count <= 28 ? 2 : 3;
  const rows = Math.ceil(count / columns);
  const gap = rows <= 6 ? 18 : rows <= 10 ? 12 : 8;

  // Alto máximo por fila que permite que entren todas.
  const maxRow = (GRID_HEIGHT - (rows - 1) * gap) / rows;
  const textBudget = maxRow - ROW_BORDER;

  // Invertimos alto = 2p + 1.2f asumiendo un padding proporcionado (p ≈ 0.36f)
  // → texto+padding ≈ 1.92f. Los clamps evitan tanto texto ilegible como una
  // fila desproporcionada cuando hay muy pocos horarios.
  const fontSize = clamp(Math.floor(textBudget / 1.92), 24, 58);
  const rowPadding = clamp(
    Math.floor((textBudget - fontSize * LINE_HEIGHT) / 2),
    6,
    34,
  );

  return { columns, fontSize, rowPadding, gap };
}

function SlotRow({
  slot,
  fontSize,
  rowPadding,
}: {
  slot: DaySlot;
  fontSize: number;
  rowPadding: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        // El libre se despega del fondo (blanco + borde acento); el ocupado se
        // hunde en él. El contraste hace el trabajo sin texto de más.
        background: slot.free ? SURFACE : LINE_2,
        border: `2px solid ${slot.free ? ACCENT : "transparent"}`,
        borderRadius: 999,
        padding: `${rowPadding}px 34px`,
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize,
          fontWeight: slot.free ? 600 : 400,
          color: slot.free ? INK_1 : INK_3,
          letterSpacing: "-1px",
          // Tachado sólo en el ocupado: se entiende sin leyenda, en cualquier
          // idioma y a tamaño de feed.
          textDecoration: slot.free ? "none" : "line-through",
        }}
      >
        {slot.time}
      </div>
      {slot.free && (
        <div
          style={{
            width: fontSize * 0.22,
            height: fontSize * 0.22,
            borderRadius: 99,
            background: ACCENT,
          }}
        />
      )}
    </div>
  );
}

export async function GET(
  req: Request,
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

  // "Hoy" en la timezone del NEGOCIO, no la del server ni la del teléfono: un
  // tenant en Buenos Aires no puede ver "hoy" según UTC.
  const today = todayInTimezone(tenant.timezone);

  const requested = new URL(req.url).searchParams.get("date");
  const date = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : today;

  const slots = await api
    .get<DaySlot[]>(`/availability/day-grid?tenantId=${tenant.id}&date=${date}`)
    .catch(() => [] as DaySlot[]);

  const freeCount = slots.filter((s) => s.free).length;
  const fitted = fitName(tenant.name);
  const metrics = gridMetrics(slots.length);

  // Reparte en N columnas manteniendo el orden por columna (la primera
  // columna es la mañana, la segunda la tarde) — leer de arriba a abajo.
  const perColumn = Math.ceil(slots.length / metrics.columns);
  const columns: DaySlot[][] = Array.from({ length: metrics.columns }, (_, i) =>
    slots.slice(i * perColumn, (i + 1) * perColumn),
  );

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
        {/* ── Encabezado ──
            flexShrink 0 en las tres secciones fijas: si la grilla se pasara de
            GRID_HEIGHT, que se recorte ella y no aplaste el encabezado. */}
        <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div
            style={{
              display: "flex",
              fontSize: 25,
              fontWeight: 600,
              color: INK_3,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              marginBottom: 18,
            }}
          >
            {freeCount > 0 ? `${freeCount} turnos libres` : "Agenda del día"}
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
          <div
            style={{
              display: "flex",
              fontSize: 32,
              fontWeight: 400,
              color: INK_2,
              letterSpacing: "-0.4px",
              marginTop: 16,
            }}
          >
            {dayLabel(date, today)}
          </div>
        </div>

        {/* ── Grilla del día ──
            flex:1 + center reparte el aire sobrante arriba y abajo en vez de
            dejar un hueco muerto contra el sticker. */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            flexDirection: "column",
            flex: 1,
            // minHeight 0 + overflow hidden: sin esto, una grilla más alta que
            // su caja desborda por arriba y por abajo (justifyContent center
            // reparte el sobrante hacia los dos lados) y termina tapando la
            // fecha y el sticker en vez de recortarse.
            minHeight: 0,
            overflow: "hidden",
            marginTop: 36,
          }}
        >
          {slots.length === 0 ? (
            <div
              style={{
                display: "flex",
                fontSize: 38,
                color: INK_3,
              }}
            >
              No hay atención este día.
            </div>
          ) : (
            <div style={{ display: "flex", gap: 16 }}>
              {columns.map((column, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    gap: metrics.gap,
                  }}
                >
                  {column.map((slot) => (
                    <SlotRow
                      key={slot.time}
                      slot={slot}
                      fontSize={metrics.fontSize}
                      rowPadding={metrics.rowPadding}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
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
            flexShrink: 0,
            paddingTop: 36,
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: '"Instrument Serif"',
              fontSize: 44,
              color: INK_2,
              letterSpacing: "-0.8px",
              marginBottom: 16,
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
              height: 112,
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
            flexShrink: 0,
            marginTop: 40,
            paddingTop: 28,
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
            {/* Mismo dominio que copia el sheet al portapapeles: si divergen,
                el cliente tipea lo que ve y cae en un 404. */}
            {getFrontendDomain()}/{tenant.slug}
          </div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      // El sheet lo lee para avisarle al dueño que la historia saldría sin
      // ningún turno reservable antes de que la publique.
      headers: { "x-free-slots": String(freeCount) },
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
