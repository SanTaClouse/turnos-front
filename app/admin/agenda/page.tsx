import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { Resource, Service } from "@/types/api";
import { AgendaView } from "./agenda-view";

export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const tenantId = session.tenant.id;

  const [resources, services] = await Promise.all([
    api.get<Resource[]>(`/resources?tenantId=${tenantId}`).catch(() => [] as Resource[]),
    api.get<Service[]>(`/services?tenantId=${tenantId}`).catch(() => [] as Service[]),
  ]);

  return (
    <AgendaView
      resources={resources.filter((r) => r.is_active)}
      services={services.filter((s) => s.is_active)}
      tenantId={tenantId}
      tenantName={session.tenant.name}
    />
  );
}
