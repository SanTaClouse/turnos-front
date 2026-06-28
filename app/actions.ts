"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, getSessionToken } from "@/lib/session";
import type { PaymentSettings } from "@/types/api";

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
 * Lee el estado de facturación actual. Lo usa la página de éxito para hacer
 * polling hasta que el webhook de MP marque la suscripción como activa.
 */
export async function getBillingStatusAction(): Promise<{
  plan_status: string;
  requires_payment: boolean;
} | null> {
  const token = getSessionToken();
  if (!token) return null;
  const res = await fetch(`${BACKEND_URL}/me/billing`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    plan_status: string;
    requires_payment: boolean;
  };
  return { plan_status: data.plan_status, requires_payment: data.requires_payment };
}

/**
 * Crea la suscripción en Mercado Pago y devuelve el init_point al que hay que
 * redirigir al dueño para autorizar el débito mensual automático.
 */
export async function createSubscriptionAction(): Promise<{
  init_point: string;
}> {
  const token = getSessionToken();
  if (!token) throw new Error("Sin sesión activa");
  const res = await fetch(`${BACKEND_URL}/me/billing/subscribe`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? "No se pudo iniciar la suscripción");
  }
  return (await res.json()) as { init_point: string };
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

// ───────────────────────── Cobros a tenant (Mercado Pago) ─────────────────

/** Estado de la conexión de MP + config de seña del tenant autenticado. */
export async function getPaymentSettingsAction(): Promise<PaymentSettings | null> {
  const token = getSessionToken();
  if (!token) return null;
  const res = await fetch(`${BACKEND_URL}/payments/status`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as PaymentSettings;
}

/** URL de autorización OAuth para conectar la cuenta de MP del tenant. */
export async function getMpConnectUrlAction(): Promise<{ url: string }> {
  const token = getSessionToken();
  if (!token) throw new Error("Sin sesión activa");
  const res = await fetch(`${BACKEND_URL}/payments/connect`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? "No se pudo iniciar la conexión");
  }
  return (await res.json()) as { url: string };
}

/** Desconecta la cuenta de Mercado Pago del tenant. */
export async function disconnectMpAction(): Promise<{ disconnected: true }> {
  const token = getSessionToken();
  if (!token) throw new Error("Sin sesión activa");
  const res = await fetch(`${BACKEND_URL}/payments/disconnect`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("No se pudo desconectar Mercado Pago");
  return (await res.json()) as { disconnected: true };
}

/** Actualiza la config de seña (modo / valor / obligatoria). */
export async function updateDepositConfigAction(input: {
  deposit_mode: "none" | "percent" | "fixed" | "full";
  deposit_value?: number;
  deposit_required?: boolean;
}): Promise<{
  deposit_mode: "none" | "percent" | "fixed" | "full";
  deposit_value: number;
  deposit_required: boolean;
}> {
  const token = getSessionToken();
  if (!token) throw new Error("Sin sesión activa");
  const res = await fetch(`${BACKEND_URL}/payments/deposit-config`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
    cache: "no-store",
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? "No se pudo guardar la configuración");
  }
  return res.json();
}
