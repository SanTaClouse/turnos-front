import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { Client, Appointment } from "@/types/api";
import { ClientesView } from "./clientes-view";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const tenantId = session.tenant.id;

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
