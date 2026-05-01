"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, getSessionToken } from "@/lib/session";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

/**
 * Setea el cookie httpOnly con el session_token devuelto por el backend.
 * Llamar desde server actions (onboarding completo, /login verificado).
 */
export async function setSessionCookie(sessionToken: string) {
  cookies().set(SESSION_COOKIE_NAME, sessionToken, {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

/**
 * Cierra la sesión: revoca en el backend y borra el cookie local.
 */
export async function logoutAction() {
  const token = getSessionToken();
  if (token) {
    try {
      await fetch(`${BACKEND_URL}/auth/admin/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
    } catch {
      /* best-effort */
    }
  }
  cookies().delete(SESSION_COOKIE_NAME);
  redirect("/login");
}

/**
 * Pide un código OTP al backend para el email del dueño.
 * No revela si el email existe (rate-limited; mismo response success/fail).
 */
export async function requestLoginCodeAction(email: string) {
  const res = await fetch(`${BACKEND_URL}/auth/admin/request-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
    cache: "no-store",
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? "No se pudo enviar el código");
  }
  return (await res.json()) as { sent: true; expiresInMinutes: number };
}

/**
 * Verifica el código y, si es válido, setea el cookie httpOnly con el
 * session_token devuelto por el backend.
 */
export async function verifyLoginCodeAction(email: string, code: string) {
  const res = await fetch(`${BACKEND_URL}/auth/admin/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
    cache: "no-store",
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? "Código inválido");
  }
  const data = (await res.json()) as {
    session_token: string;
    tenant: { id: string; name: string; slug: string };
  };
  await setSessionCookie(data.session_token);
  return data;
}

/**
 * Revoca una sesión específica (panel de dispositivos).
 */
export async function revokeSessionAction(sessionId: string) {
  const token = getSessionToken();
  if (!token) throw new Error("Sin sesión activa");
  const res = await fetch(`${BACKEND_URL}/auth/admin/sessions/${sessionId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? "No se pudo revocar la sesión");
  }
  return res.json();
}
