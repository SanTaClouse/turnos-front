import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import { getTenantId } from "@/lib/tenant";
import type { Client, Appointment } from "@/types/api";
import { ClientesView } from "./clientes-view";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const tenantId = getTenantId();
  if (!tenantId) redirect("/onboarding");

  const [clients, appointments] = await Promise.all([
    api.get<Client[]>(`/clients?tenantId=${tenantId}`).catch(() => [] as Client[]),
    api.get<Appointment[]>(`/appointments?tenantId=${tenantId}`).catch(() => [] as Appointment[]),
  ]);

  return (
    <ClientesView
      initialClients={clients}
      appointments={appointments}
      tenantId={tenantId}
    />
  );
}
