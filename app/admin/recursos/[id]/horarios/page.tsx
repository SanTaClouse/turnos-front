import { notFound, redirect } from "next/navigation";
import { api } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { Resource, Availability } from "@/types/api";
import { HorariosView } from "./horarios-view";

export const dynamic = "force-dynamic";

interface Props {
  params: { id: string };
}

export default async function HorariosPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  const tenantId = session.tenant.id;

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
