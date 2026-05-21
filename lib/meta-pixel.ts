// Meta Pixel — wrapper SSR-safe sobre la API global `fbq`.
//
// Si NEXT_PUBLIC_META_PIXEL_ID no está definido, todas las funciones son
// no-ops silenciosos (sin logs ni errores). Esto permite dejar las llamadas
// `trackEvent(...)` repartidas por la app sin condicional adicional.

export type MetaStandardEvent =
  | "PageView"
  | "ViewContent"
  | "CompleteRegistration"
  | "Subscribe"
  | "Lead"
  | "Contact"
  | "StartTrial";

type FbqArgs =
  | [command: "init", pixelId: string]
  | [command: "track", event: MetaStandardEvent, params?: Record<string, unknown>]
  | [command: "trackCustom", event: string, params?: Record<string, unknown>]
  | [command: string, ...rest: unknown[]];

interface FbqFn {
  (...args: FbqArgs): void;
  callMethod?: (...args: FbqArgs) => void;
  queue: FbqArgs[];
  push: FbqFn;
  loaded: boolean;
  version: string;
}

declare global {
  interface Window {
    fbq?: FbqFn;
    _fbq?: FbqFn;
  }
}

function getPixelId(): string | undefined {
  return process.env.NEXT_PUBLIC_META_PIXEL_ID || undefined;
}

function isEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (!getPixelId()) return false;
  return true;
}

/**
 * Inicializa la función global `fbq` con el pixel ID dado.
 * Idempotente: si ya existe `window.fbq`, sólo llama `init` con el ID.
 */
export function initPixel(pixelId: string): void {
  if (typeof window === "undefined" || !pixelId) return;

  if (!window.fbq) {
    const n: FbqFn = function (...args: FbqArgs) {
      if (n.callMethod) {
        n.callMethod(...args);
      } else {
        n.queue.push(args);
      }
    } as FbqFn;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    window.fbq = n;
    if (!window._fbq) window._fbq = n;
  }

  window.fbq("init", pixelId);
}

/**
 * Dispara un evento estándar de Meta. No-op si el pixel no está configurado
 * o si se ejecuta en SSR.
 */
export function trackEvent(
  name: MetaStandardEvent,
  params?: Record<string, unknown>,
): void {
  if (!isEnabled()) return;
  window.fbq?.("track", name, params);
}

/**
 * Dispara un evento custom (no estándar) de Meta. Mismo contrato no-op
 * que `trackEvent`.
 */
export function trackCustomEvent(
  name: string,
  params?: Record<string, unknown>,
): void {
  if (!isEnabled()) return;
  window.fbq?.("trackCustom", name, params);
}

/**
 * Dispara un evento estándar una sola vez por sesión de navegador,
 * usando `sessionStorage` con la clave `dedupeKey`. Útil para eventos
 * que pueden gatillarse desde múltiples re-renders o re-blurs.
 *
 * Si `sessionStorage` no está disponible (modo privado), no dispara.
 */
export function trackEventOnce(
  dedupeKey: string,
  name: MetaStandardEvent,
  params?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  try {
    if (sessionStorage.getItem(dedupeKey)) return;
    trackEvent(name, params);
    sessionStorage.setItem(dedupeKey, "1");
  } catch {
    // sessionStorage puede no estar disponible — ignorar.
  }
}

/**
 * Dispara un evento custom una sola vez por sesión. Mismo contrato
 * que `trackEventOnce` pero usa `trackCustom` por debajo.
 */
export function trackCustomEventOnce(
  dedupeKey: string,
  name: string,
  params?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  try {
    if (sessionStorage.getItem(dedupeKey)) return;
    trackCustomEvent(name, params);
    sessionStorage.setItem(dedupeKey, "1");
  } catch {
    // sessionStorage puede no estar disponible — ignorar.
  }
}

/**
 * VERIFICAR INSTALACIÓN:
 * 1. Instalar la extensión "Meta Pixel Helper" en Chrome
 * 2. Entrar a turno1min.app
 * 3. La extensión debe mostrar el pixel ID y "1 PageView event"
 * 4. Navegar por la app y verificar que disparan los demás eventos
 * 5. En Meta Events Manager → Test Events, pegar la URL del sitio para ver eventos en tiempo real
 */
