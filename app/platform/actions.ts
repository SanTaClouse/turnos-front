"use server";

import { cookies } from "next/headers";
import type { PlatformTenantRow } from "@/types/api";

const COOKIE = "platform_admin_key";
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const ONE_WEEK = 60 * 60 * 24 * 7;

/**
 * "Login" del panel de plataforma: la clave de admin ES la contraseña. La
 * validamos contra el backend (que la compara con PLATFORM_ADMIN_KEY) y, si es
 * correcta, la guardamos en una cookie httpOnly. El frontend nunca conoce la
 * clave real: solo guarda lo que se tipeó y lo reenvía como x-admin-key.
 */
export async function loginPlatformAction(key: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/platform/tenants`, {
    headers: { "x-admin-key": key },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Clave incorrecta");
  }
  cookies().set(COOKIE, key, {
    path: "/",
    maxAge: ONE_WEEK,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function logoutPlatformAction(): Promise<void> {
  cookies().delete(COOKIE);
}

/** Lee la lista de tenants (server-only). Devuelve null si no hay sesión válida. */
export async function getPlatformTenants(): Promise<PlatformTenantRow[] | null> {
  const key = cookies().get(COOKIE)?.value;
  if (!key) return null;
  const res = await fetch(`${BACKEND_URL}/platform/tenants`, {
    headers: { "x-admin-key": key },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as PlatformTenantRow[];
}

/** Cambia exención de cobro y/o cupo gratis de un tenant. */
export async function setTenantBillingAction(
  id: string,
  flags: { billing_exempt?: boolean; free_client_limit?: number },
): Promise<void> {
  const key = cookies().get(COOKIE)?.value;
  if (!key) throw new Error("Sin sesión de plataforma");
  const res = await fetch(`${BACKEND_URL}/platform/tenants/${id}/billing`, {
    method: "PATCH",
    headers: { "x-admin-key": key, "Content-Type": "application/json" },
    body: JSON.stringify(flags),
    cache: "no-store",
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? "No se pudo actualizar");
  }
}
