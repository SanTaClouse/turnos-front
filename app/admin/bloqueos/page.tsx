import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { BlockedSlot, Resource } from "@/types/api";
import { BloqueosView } from "./bloqueos-view";

export const dynamic = "force-dynamic";

export default async function BloqueosPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const tenantId = session.tenant.id;

  const [blocked, resources] = await Promise.all([
    api
      .get<BlockedSlot[]>(`/blocked-slots?tenantId=${tenantId}`)
      .catch(() => [] as BlockedSlot[]),
    api
      .get<Resource[]>(`/resources?tenantId=${tenantId}`)
      .catch(() => [] as Resource[]),
  ]);

  return (
    <BloqueosView
      tenantId={tenantId}
      timezone={session.tenant.timezone}
      initialBlocks={blocked}
      resources={resources.filter((r) => r.is_active)}
    />
  );
}
