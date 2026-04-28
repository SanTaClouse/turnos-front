import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import type { Tenant, Service, Resource } from "@/types/api";
import { BookingFlow } from "./booking-flow";

interface Props {
  params: { slug: string };
}

async function getTenant(slug: string): Promise<Tenant | null> {
  try {
    return await api.get<Tenant>(`/tenants/slug/${slug}`);
  } catch {
    return null;
  }
}

export default async function ReservarPage({ params }: Props) {
  const tenant = await getTenant(params.slug);
  if (!tenant || !tenant.is_public) notFound();

  const [services, resources] = await Promise.all([
    api.get<Service[]>(`/services?tenantId=${tenant.id}`).catch(() => [] as Service[]),
    api.get<Resource[]>(`/resources?tenantId=${tenant.id}`).catch(() => [] as Resource[]),
  ]);

  const activeServices = services.filter((s) => s.is_active);
  const activeResources = resources.filter((r) => r.is_active);

  return (
    <BookingFlow
      tenant={tenant}
      services={activeServices}
      resources={activeResources}
    />
  );
}
