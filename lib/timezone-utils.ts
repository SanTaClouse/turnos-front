// Detectar y mapear timezone automáticamente

export interface LocationConfig {
  timezone: string;
  locale: string;
  currency: string;
  country: string;
}

// Mapeo de timezones a configuración de país
const TIMEZONE_MAP: Record<string, LocationConfig> = {
  // Argentina
  "America/Argentina/Buenos_Aires": {
    timezone: "America/Argentina/Buenos_Aires",
    locale: "es-AR",
    currency: "ARS",
    country: "AR",
  },
  "America/Argentina/Cordoba": {
    timezone: "America/Argentina/Buenos_Aires",
    locale: "es-AR",
    currency: "ARS",
    country: "AR",
  },
  "America/Argentina/Salta": {
    timezone: "America/Argentina/Buenos_Aires",
    locale: "es-AR",
    currency: "ARS",
    country: "AR",
  },

  // México
  "America/Mexico_City": {
    timezone: "America/Mexico_City",
    locale: "es-MX",
    currency: "MXN",
    country: "MX",
  },
  "America/Monterrey": {
    timezone: "America/Mexico_City",
    locale: "es-MX",
    currency: "MXN",
    country: "MX",
  },
  "America/Chihuahua": {
    timezone: "America/Mexico_City",
    locale: "es-MX",
    currency: "MXN",
    country: "MX",
  },

  // Brasil
  "America/Sao_Paulo": {
    timezone: "America/Sao_Paulo",
    locale: "pt-BR",
    currency: "BRL",
    country: "BR",
  },
  "America/Manaus": {
    timezone: "America/Sao_Paulo",
    locale: "pt-BR",
    currency: "BRL",
    country: "BR",
  },

  // Colombia
  "America/Bogota": {
    timezone: "America/Bogota",
    locale: "es-CO",
    currency: "COP",
    country: "CO",
  },

  // Chile
  "America/Santiago": {
    timezone: "America/Santiago",
    locale: "es-CL",
    currency: "CLP",
    country: "CL",
  },

  // Venezuela
  "America/Caracas": {
    timezone: "America/Caracas",
    locale: "es-VE",
    currency: "VEF",
    country: "VE",
  },

  // España
  "Europe/Madrid": {
    timezone: "Europe/Madrid",
    locale: "es-ES",
    currency: "EUR",
    country: "ES",
  },

  // USA
  "America/New_York": {
    timezone: "America/New_York",
    locale: "en-US",
    currency: "USD",
    country: "US",
  },
  "America/Los_Angeles": {
    timezone: "America/Los_Angeles",
    locale: "en-US",
    currency: "USD",
    country: "US",
  },
  "America/Chicago": {
    timezone: "America/Chicago",
    locale: "en-US",
    currency: "USD",
    country: "US",
  },
  "America/Denver": {
    timezone: "America/Denver",
    locale: "en-US",
    currency: "USD",
    country: "US",
  },
};

/**
 * Detecta automáticamente la zona horaria del navegador del usuario
 * y retorna la configuración correspondiente (timezone, locale, currency)
 */
export function detectLocationConfig(): LocationConfig {
  try {
    // Obtener timezone del navegador
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Buscar en el mapa
    if (TIMEZONE_MAP[timezone]) {
      return TIMEZONE_MAP[timezone];
    }

    // Si no encuentra coincidencia exacta, intentar inferir por prefijo
    const prefix = timezone.split("/")[0]; // "America", "Europe", etc.

    // Fallbacks por región
    if (timezone.includes("America/Argentina")) {
      return TIMEZONE_MAP["America/Argentina/Buenos_Aires"]!;
    }
    if (timezone.includes("America/Mexico")) {
      return TIMEZONE_MAP["America/Mexico_City"]!;
    }
    if (timezone.includes("America") && timezone.includes("Sao")) {
      return TIMEZONE_MAP["America/Sao_Paulo"]!;
    }

    // Default: Argentina (la mayoría de usuarios serán de ARG)
    return TIMEZONE_MAP["America/Argentina/Buenos_Aires"]!;
  } catch (error) {
    console.error("Error detecting timezone:", error);
    // Fallback seguro
    return TIMEZONE_MAP["America/Argentina/Buenos_Aires"]!;
  }
}

/**
 * Obtiene solo el timezone detectado
 */
export function detectTimezone(): string {
  return detectLocationConfig().timezone;
}

/**
 * Obtiene solo el locale detectado
 */
export function detectLocale(): string {
  return detectLocationConfig().locale;
}

/**
 * Obtiene solo la moneda detectada
 */
export function detectCurrency(): string {
  return detectLocationConfig().currency;
}

// ───────────────────────── Fecha/hora en una zona horaria ─────────────────────
// IMPORTANTE: nunca usar new Date().toISOString().slice(0,10) para calcular "hoy".
// toISOString() devuelve la fecha en UTC, así que después de las 21:00 en Argentina
// (UTC−3) "hoy" salta a mañana. Estas helpers formatean en la zona del NEGOCIO
// (tenant.timezone), igual que hace el backend, para que ambos coincidan siempre.

/** Fecha (YYYY-MM-DD) de una fecha puntual, en una zona horaria IANA. */
export function ymdInTimezone(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Fecha "hoy" (YYYY-MM-DD) en la zona horaria del negocio. */
export function todayInTimezone(timezone: string): string {
  return ymdInTimezone(new Date(), timezone);
}

/**
 * Fecha "hoy" (YYYY-MM-DD) según la zona LOCAL del navegador (no UTC).
 * Usar sólo cuando no se tiene la zona del negocio a mano; preferir
 * todayInTimezone() para que frontend y backend coincidan siempre.
 */
export function todayLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Hora actual "HH:MM" (24h) en la zona horaria del negocio. */
export function nowTimeInTimezone(timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hourCycle: "h23", // 00–23, evita el "24:00" de medianoche en algunos motores
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("hour")}:${get("minute")}`;
}

/**
 * Suma (o resta) días a una fecha YYYY-MM-DD trabajando sobre el calendario.
 * No pasa por UTC (nada de toISOString), así que no hay corrimiento de día.
 */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days); // aritmética en horario local
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

// ───────────────────────── Países soportados ─────────────────────────────────
// Un país define de una sola vez timezone + moneda + locale + código telefónico.
// Se usa en el onboarding (autodetección) y en Ajustes (selector manual), para que
// nunca queden mezclados (ej: timezone de México con moneda de Argentina).

export interface CountryOption {
  code: string; // ISO 3166-1 alpha-2
  label: string;
  timezone: string;
  currency: string;
  locale: string;
  dialCode: string;
}

export const COUNTRY_OPTIONS: CountryOption[] = [
  { code: "AR", label: "Argentina", timezone: "America/Argentina/Buenos_Aires", currency: "ARS", locale: "es-AR", dialCode: "+54" },
  { code: "MX", label: "México", timezone: "America/Mexico_City", currency: "MXN", locale: "es-MX", dialCode: "+52" },
  { code: "UY", label: "Uruguay", timezone: "America/Montevideo", currency: "UYU", locale: "es-UY", dialCode: "+598" },
  { code: "CL", label: "Chile", timezone: "America/Santiago", currency: "CLP", locale: "es-CL", dialCode: "+56" },
  { code: "CO", label: "Colombia", timezone: "America/Bogota", currency: "COP", locale: "es-CO", dialCode: "+57" },
  { code: "PE", label: "Perú", timezone: "America/Lima", currency: "PEN", locale: "es-PE", dialCode: "+51" },
  { code: "BR", label: "Brasil", timezone: "America/Sao_Paulo", currency: "BRL", locale: "pt-BR", dialCode: "+55" },
  { code: "ES", label: "España", timezone: "Europe/Madrid", currency: "EUR", locale: "es-ES", dialCode: "+34" },
];

/** Busca el país cuya zona horaria coincide (para preseleccionar en Ajustes). */
export function countryByTimezone(timezone: string): CountryOption | undefined {
  return COUNTRY_OPTIONS.find((c) => c.timezone === timezone);
}
