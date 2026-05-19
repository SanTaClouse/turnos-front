import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { EarningsResult, MonthlySummary } from "@/types/api";
import { GananciasView } from "./ganancias-view";

export const dynamic = "force-dynamic";

export default async function GananciasPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const tenantId = session.tenant.id;

  const [initial, summary] = await Promise.all([
    api
      .get<EarningsResult>(`/earnings/summary?tenantId=${tenantId}&period=semana`)
      .catch(() => null),
    api
      .get<MonthlySummary | null>(`/ai-summaries/current?tenantId=${tenantId}`)
      .catch(() => null),
  ]);

  return (
    <GananciasView
      tenantId={tenantId}
      initial={initial}
      summary={summary}
    />
  );
}
