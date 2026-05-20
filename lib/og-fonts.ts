// Carga las fuentes de Instrument Serif (normal + italic) para `next/og`.
//
// Por qué resolvemos las URLs vía la CSS API de Google en vez de hardcodear:
// Google rota la versión periódicamente (v5 → v13 → ...). Una URL hardcodeada
// se rompe silenciosamente — devuelve 404, Satori recibe bytes basura,
// `ImageResponse` tira excepción, y WhatsApp/Twitter/Facebook ven 0 imágenes.

const GOOGLE_FONTS_CSS =
  "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap";

// User-Agent moderno: sin esto, Google devuelve TTF (más pesado) en lugar de woff2.
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

type FontPair = { regular: ArrayBuffer; italic: ArrayBuffer | null };

let cached: Promise<FontPair> | null = null;

async function resolveAndFetch(): Promise<FontPair> {
  const cssRes = await fetch(GOOGLE_FONTS_CSS, { headers: { "User-Agent": UA } });
  if (!cssRes.ok) throw new Error(`Google Fonts CSS ${cssRes.status}`);
  const css = await cssRes.text();

  // Quedate sólo con el subset latin (cubre español: ñ, á-ú, ü).
  // La CSS trae bloques latin-ext + latin; el latin es el último de cada estilo.
  let regularUrl: string | null = null;
  let italicUrl: string | null = null;
  for (const block of css.split("@font-face").slice(1)) {
    const urlMatch = block.match(/src:\s*url\(([^)]+)\)/);
    const styleMatch = block.match(/font-style:\s*(\w+)/);
    const unicodeMatch = block.match(/unicode-range:\s*([^;]+)/);
    if (!urlMatch) continue;
    const url = urlMatch[1];
    const isLatinBasic = unicodeMatch?.[1].includes("U+0000-00FF");
    if (!isLatinBasic) continue;
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

/**
 * Devuelve ArrayBuffers de Instrument Serif para usar con `ImageResponse`.
 * Cachea a nivel de módulo: una vez por warm start del runtime.
 * Si Google falla, propaga el error para que el OG route devuelva 500
 * (mejor que renderizar con fuentes corruptas).
 */
export function loadInstrumentSerif(): Promise<FontPair> {
  if (!cached) {
    cached = resolveAndFetch().catch((err) => {
      // No memoizar el error — reintentar en la próxima llamada.
      cached = null;
      throw err;
    });
  }
  return cached;
}
