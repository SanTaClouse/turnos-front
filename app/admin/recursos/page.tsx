import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { Service, Resource } from "@/types/api";
import { RecursosView } from "./recursos-view";

export const dynamic = "force-dynamic";

export default async function RecursosPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const tenantId = session.tenant.id;

  const [resources, services] = await Promise.all([
    api.get<Resource[]>(`/resources?tenantId=${tenantId}`).catch(() => [] as Resource[]),
    api.get<Service[]>(`/services?tenantId=${tenantId}`).catch(() => [] as Service[]),
  ]);

  return (
    <RecursosView
      initialResources={resources}
      services={services}
      tenantId={tenantId}
    />
  );
}
