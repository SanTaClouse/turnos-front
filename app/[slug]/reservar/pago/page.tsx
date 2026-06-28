import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import type { Tenant } from "@/types/api";
import { PagoView } from "./pago-view";

interface Props {
  params: { slug: string };
}

export default async function PagoPage({ params }: Props) {
  const tenant = await api
    .get<Tenant>(`/tenants/slug/${params.slug}`)
    .catch(() => null);
  if (!tenant) notFound();

  return <PagoView slug={params.slug} tenant={tenant} />;
}
