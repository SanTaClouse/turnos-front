import { notFound, redirect } from "next/navigation";
import { api } from "@/lib/api";
import { getTenantId } from "@/lib/tenant";
import type { Resource, Availability } from "@/types/api";
import { HorariosView } from "./horarios-view";

export const dynamic = "force-dynamic";

interface Props {
  params: { id: string };
}

export default async function HorariosPage({ params }: Props) {
  const tenantId = getTenantId();
  if (!tenantId) redirect("/onboarding");

  const resource = await api
    .get<Resource>(`/resources/${params.id}`)
    .catch(() => null);

  if (!resource) notFound();

  const allAvailabilities = await api
    .get<Availability[]>(`/availability/${tenantId}`)
    .catch(() => [] as Availability[]);

  const availabilities = allAvailabilities.filter(
    (a) => a.resource_id === params.id,
  );

  return (
    <HorariosView
      resource={resource}
      initialAvailabilities={availabilities}
      tenantId={tenantId}
    />
  );
}
