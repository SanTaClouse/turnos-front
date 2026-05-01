import { notFound, redirect } from "next/navigation";
import { api } from "@/lib/api";
import { getSession, getSessionToken } from "@/lib/session";
import type { Tenant, AdminSession } from "@/types/api";
import { AjustesView } from "./ajustes-view";

export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

async function getActiveSessions(token: string): Promise<AdminSession[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/auth/admin/sessions`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return (await res.json()) as AdminSession[];
  } catch {
    return [];
  }
}

export default async function AjustesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const tenantId = session.tenant.id;
  const tenant = await api.get<Tenant>(`/tenants/${tenantId}`).catch(() => null);
  if (!tenant) notFound();

  const token = getSessionToken();
  const sessions = token ? await getActiveSessions(token) : [];

  return (
    <AjustesView
      initialTenant={tenant}
      sessions={sessions}
      currentSessionId={session.session.id}
    />
  );
}
