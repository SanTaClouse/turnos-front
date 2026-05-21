import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import type { Tenant, Service, Resource, Availability, BlockedSlot } from "@/types/api";
import { BookingFlow } from "./booking-flow";
import { expandFullDayBlocks } from "@/lib/blocked-dates";

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

  const [services, resources, availability, blocked] = await Promise.all([
    api.get<Service[]>(`/services?tenantId=${tenant.id}`).catch(() => [] as Service[]),
    api.get<Resource[]>(`/resources?tenantId=${tenant.id}`).catch(() => [] as Resource[]),
    api.get<Availability[]>(`/availability/${tenant.id}`).catch(() => [] as Availability[]),
    api.get<BlockedSlot[]>(`/blocked-slots?tenantId=${tenant.id}`).catch(() => [] as BlockedSlot[]),
  ]);

  const activeServices = services.filter((s) => s.is_active);
  const activeResources = resources.filter((r) => r.is_active);

  // Días de la semana (0=domingo .. 6=sábado) donde al menos un recurso
  // tiene una regla de disponibilidad. Usado en StepDate para grisar
  // los días que claramente NO tienen turnos, evitando que el usuario
  // entre a un día muerto. Si el tenant aún no configuró nada,
  // el array queda vacío y StepDate trata todos los días como válidos
  // (mejor permitir y mostrar mensaje en StepTime que bloquear todo).
  const availableDaysOfWeek = Array.from(
    new Set(availability.map((a) => a.day_of_week)),
  );

  // Sólo grisamos días donde TODO el negocio está bloqueado el día entero
  // (resource_id null + sin rango horario). Bloqueos parciales o por recurso
  // los resuelve /availability/slots en el paso de hora.
  const blockedDates = Array.from(expandFullDayBlocks(blocked));

  return (
    <BookingFlow
      tenant={tenant}
      services={activeServices}
      resources={activeResources}
      availableDaysOfWeek={availableDaysOfWeek}
      blockedDates={blockedDates}
    />
  );
}
