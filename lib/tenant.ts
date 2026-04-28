import { cookies } from "next/headers";

const COOKIE_NAME = "tenant_id";

/**
 * Devuelve el tenantId del admin actual.
 *
 * Orden de resolución:
 * 1. Cookie `tenant_id` (seteada al terminar el onboarding)
 * 2. `NEXT_PUBLIC_ADMIN_TENANT_ID` (fallback para devs sin onboarding completo)
 *
 * Cuando agreguemos auth, esto se reemplaza por `session.user.tenantId`.
 */
export function getTenantId(): string {
  const fromCookie = cookies().get(COOKIE_NAME)?.value;
  if (fromCookie) return fromCookie;
  return process.env.NEXT_PUBLIC_ADMIN_TENANT_ID ?? "";
}

export const TENANT_COOKIE_NAME = COOKIE_NAME;
