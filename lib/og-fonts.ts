// Carga las fuentes de Instrument Serif (normal + italic) para `next/og`.
//
// Notas críticas:
//
// 1. Satori (motor de `@vercel/og`) NO soporta woff2 — sólo TTF/OTF.
//    Si Google devuelve woff2, el build prerender de Vercel explota con
//    "Unsupported OpenType signature wOF2". Por eso pedimos la CSS SIN
//    User-Agent moderno: Google entrega TTF a clientes legacy.
//
// 2. Resolvemos las URLs vía la CSS API en vez de hardcodearlas porque
//    Google rota la versión periódicamente (v5 → v13 → ...). Una URL
//    hardcodeada se rompe silenciosamente — 404, Satori recibe bytes
//    basura, ImageResponse tira, WhatsApp/Twitter no ven la imagen.

const GOOGLE_FONTS_CSS =
  "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap";

const INTER_TIGHT_CSS =
  "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;600&display=swap";

type FontPair = { regular: ArrayBuffer; italic: ArrayBuffer | null };

let cached: Promise<FontPair> | null = null;

async function resolveAndFetch(): Promise<FontPair> {
  const cssRes = await fetch(GOOGLE_FONTS_CSS);
  if (!cssRes.ok) throw new Error(`Google Fonts CSS ${cssRes.status}`);
  const css = await cssRes.text();

  let regularUrl: string | null = null;
  let italicUrl: string | null = null;
  for (const block of css.split("@font-face").slice(1)) {
    const urlMatch = block.match(/src:\s*url\(([^)]+)\)/);
    const styleMatch = block.match(/font-style:\s*(\w+)/);
    if (!urlMatch) continue;
    const url = urlMatch[1];
    if (styleMatch?.[1] === "italic") italicUrl = url;
    else regularUrl = url;
  }

  if (!regularUrl) throw new Error("Instrument Serif regular URL no encontrada");

  const [regular, italic] = await Promise.all([
    fetch(regularUrl).then((r) => {
      if (!r.ok) throw new Error(`Font fetch ${r.status}`);
      return r.arrayBuffer();
    }),
    italicUrl
      ? fetch(italicUrl).then((r) => (r.ok ? r.arrayBuffer() : null))
      : Promise.resolve(null),
  ]);

  return { regular, italic };
}

type InterWeights = { regular: ArrayBuffer; semibold: ArrayBuffer | null };

let interCached: Promise<InterWeights> | null = null;

async function resolveAndFetchInter(): Promise<InterWeights> {
  const cssRes = await fetch(INTER_TIGHT_CSS);
  if (!cssRes.ok) throw new Error(`Inter Tight CSS ${cssRes.status}`);
  const css = await cssRes.text();

  // Google devuelve un @font-face por peso; los mapeamos por font-weight.
  const byWeight = new Map<string, string>();
  for (const block of css.split("@font-face").slice(1)) {
    const urlMatch = block.match(/src:\s*url\(([^)]+)\)/);
    const weightMatch = block.match(/font-weight:\s*(\d+)/);
    if (urlMatch && weightMatch) byWeight.set(weightMatch[1], urlMatch[1]);
  }

  const regularUrl = byWeight.get("400");
  if (!regularUrl) throw new Error("Inter Tight 400 URL no encontrada");
  const semiboldUrl = byWeight.get("600");

  const [regular, semibold] = await Promise.all([
    fetch(regularUrl).then((r) => {
      if (!r.ok) throw new Error(`Font fetch ${r.status}`);
      return r.arrayBuffer();
    }),
    semiboldUrl
      ? fetch(semiboldUrl).then((r) => (r.ok ? r.arrayBuffer() : null))
      : Promise.resolve(null),
  ]);

  return { regular, semibold };
}

/**
 * Inter Tight (400 + 600) en TTF para `ImageResponse`.
 *
 * Sin esto, cualquier texto con `fontFamily: "Inter Tight"` cae al fallback de
 * Satori y termina renderizando en serif — que en una grilla de horarios se ve
 * roto. Mismas restricciones que Instrument Serif: TTF, no woff2.
 */
export function loadInterTight(): Promise<InterWeights> {
  if (!interCached) {
    interCached = resolveAndFetchInter().catch((err) => {
      interCached = null;
      throw err;
    });
  }
  return interCached;
}

/**
 * Devuelve ArrayBuffers TTF de Instrument Serif para usar con `ImageResponse`.
 * Cachea a nivel de módulo: una vez por warm start del runtime.
 * Si Google falla, propaga el error para no renderizar con fuente corrupta.
 */
export function loadInstrumentSerif(): Promise<FontPair> {
  if (!cached) {
    cached = resolveAndFetch().catch((err) => {
      cached = null;
      throw err;
    });
  }
  return cached;
}
