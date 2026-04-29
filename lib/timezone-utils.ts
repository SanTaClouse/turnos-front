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
