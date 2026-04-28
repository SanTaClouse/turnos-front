"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TENANT_COOKIE_NAME } from "@/lib/tenant";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function setTenantCookie(tenantId: string) {
  cookies().set(TENANT_COOKIE_NAME, tenantId, {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    httpOnly: false, // accesible desde el client por ahora; cuando agreguemos auth real, true
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearTenantCookie() {
  cookies().delete(TENANT_COOKIE_NAME);
  redirect("/");
}
