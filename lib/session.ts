import { cookies } from "next/headers";
import type { AdminMe } from "@/types/api";

const SESSION_COOKIE = "turnosapp_session";
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export const SESSION_COOKIE_NAME = SESSION_COOKIE;

/**
 * Lee el cookie de sesión y valida contra el backend.
 * Devuelve null si no hay cookie o si la sesión está revocada/inválida.
 *
 * Llamar esto SOLO desde server components o server actions (usa cookies()).
 */
export async function getSession(): Promise<AdminMe | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const res = await fetch(`${BACKEND_URL}/auth/admin/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as AdminMe;
  } catch {
    return null;
  }
}

/**
 * Atajo: tenantId de la sesión actual, o "" si no hay sesión válida.
 * Útil para mantener compatibilidad con el código previo que usaba getTenantId().
 */
export async function getTenantId(): Promise<string> {
  const me = await getSession();
  return me?.tenant.id ?? "";
}

/**
 * Atajo: el token raw, para reenviar al backend en server fetches que necesiten
 * autenticación. NO retornar al cliente — esto vive solo en server.
 */
export function getSessionToken(): string | null {
  return cookies().get(SESSION_COOKIE)?.value ?? null;
}
