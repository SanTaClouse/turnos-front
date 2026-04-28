import { notFound, redirect } from "next/navigation";
import { api } from "@/lib/api";
import { getTenantId } from "@/lib/tenant";
import type { Tenant } from "@/types/api";
import { AjustesView } from "./ajustes-view";

export const dynamic = "force-dynamic";

export default async function AjustesPage() {
  const tenantId = getTenantId();
  if (!tenantId) redirect("/onboarding");

  const tenant = await api.get<Tenant>(`/tenants/${tenantId}`).catch(() => null);
  if (!tenant) notFound();

  return <AjustesView initialTenant={tenant} />;
}
