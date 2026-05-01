import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { Service, Resource } from "@/types/api";
import { ServiciosView } from "./servicios-view";

export const dynamic = "force-dynamic";

export default async function ServiciosPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const tenantId = session.tenant.id;

  const [services, resources] = await Promise.all([
    api.get<Service[]>(`/services?tenantId=${tenantId}`).catch(() => [] as Service[]),
    api.get<Resource[]>(`/resources?tenantId=${tenantId}`).catch(() => [] as Resource[]),
  ]);

  return (
    <ServiciosView
      initialServices={services}
      resources={resources}
      tenantId={tenantId}
    />
  );
}
