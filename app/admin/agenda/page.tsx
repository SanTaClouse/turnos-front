import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import { getTenantId } from "@/lib/tenant";
import type { Resource, Service } from "@/types/api";
import { AgendaView } from "./agenda-view";

export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const tenantId = getTenantId();
  if (!tenantId) redirect("/onboarding");

  const [resources, services] = await Promise.all([
    api.get<Resource[]>(`/resources?tenantId=${tenantId}`).catch(() => [] as Resource[]),
    api.get<Service[]>(`/services?tenantId=${tenantId}`).catch(() => [] as Service[]),
  ]);

  return (
    <AgendaView
      resources={resources.filter((r) => r.is_active)}
      services={services.filter((s) => s.is_active)}
      tenantId={tenantId}
    />
  );
}
