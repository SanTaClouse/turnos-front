import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import { getTenantId } from "@/lib/tenant";
import type { Service, Resource } from "@/types/api";
import { ServiciosView } from "./servicios-view";

export const dynamic = "force-dynamic";

export default async function ServiciosPage() {
  const tenantId = getTenantId();
  if (!tenantId) redirect("/onboarding");

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
