import { getSessionToken } from "@/lib/session";
import type { BillingStatus } from "@/types/api";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

/**
 * Lee el estado de facturación del tenant autenticado.
 *
 * Server-only (usa el cookie httpOnly vía getSessionToken). El estado vive en
 * la base, así que es la misma verdad para todos los dispositivos del dueño.
 * Devuelve null si no hay sesión o si el backend falla (fail-open: no
 * bloqueamos el panel por un error de red).
 */
export async function getBillingStatus(): Promise<BillingStatus | null> {
  const token = getSessionToken();
  if (!token) return null;

  try {
    const res = await fetch(`${BACKEND_URL}/me/billing`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as BillingStatus;
  } catch {
    return null;
  }
}
