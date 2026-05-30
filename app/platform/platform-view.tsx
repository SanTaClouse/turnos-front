"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Users } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { setTenantBillingAction, logoutPlatformAction } from "./actions";
import type { PlatformTenantRow } from "@/types/api";

const PLAN_LABEL: Record<PlatformTenantRow["plan_status"], string> = {
  free: "Gratis",
  active: "Suscripto",
  past_due: "En gracia / vencido",
  cancelled: "Cancelado",
};

const PLAN_COLOR: Record<PlatformTenantRow["plan_status"], string> = {
  free: "var(--ink-2)",
  active: "var(--accent)",
  past_due: "var(--danger)",
  cancelled: "var(--ink-3)",
};

export function PlatformView({ tenants }: { tenants: PlatformTenantRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  function toggleExempt(t: PlatformTenantRow, exempt: boolean) {
    setBusyId(t.id);
    startTransition(async () => {
      try {
        await setTenantBillingAction(t.id, { billing_exempt: exempt });
        router.refresh();
      } finally {
        setBusyId(null);
      }
    });
  }

  async function handleLogout() {
    await logoutPlatformAction();
    router.refresh();
  }

  return (
    <div
      className="min-h-screen bg-bg flex flex-col"
      style={{ height: "100dvh", maxWidth: 480, margin: "0 auto" }}
    >
      <header className="flex items-center justify-between px-[20px] pt-[16px] pb-[12px] flex-shrink-0">
        <div>
          <h1 className="font-serif text-[24px] leading-tight">Plataforma</h1>
          <p className="text-[13px] text-ink-2">
            {tenants.length} negocio{tenants.length === 1 ? "" : "s"}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="press-fx w-[38px] h-[38px] rounded-full border border-line bg-surface flex items-center justify-center"
          aria-label="Salir"
        >
          <LogOut size={16} color="var(--ink-1)" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto hide-scroll px-[16px] pb-[24px] flex flex-col gap-[10px]">
        {tenants.map((t) => {
          const overLimit = t.client_count >= t.free_client_limit;
          return (
            <div
              key={t.id}
              className="rounded-[14px] border border-line bg-surface p-[16px]"
            >
              <div className="flex items-start justify-between gap-[12px]">
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-ink-1 truncate">
                    {t.name}
                  </p>
                  <p className="text-[12px] text-ink-2 truncate">
                    {t.email ?? "sin email"} · /{t.slug}
                  </p>
                </div>
                <span
                  className="text-[11px] font-medium px-[8px] py-[3px] rounded-full whitespace-nowrap"
                  style={{
                    color: PLAN_COLOR[t.plan_status],
                    backgroundColor: "var(--line-2)",
                  }}
                >
                  {PLAN_LABEL[t.plan_status]}
                </span>
              </div>

              <div className="flex items-center gap-[6px] mt-[10px] text-[13px] text-ink-2">
                <Users size={14} />
                <span
                  style={{
                    color: overLimit ? "var(--danger)" : "var(--ink-2)",
                  }}
                >
                  {t.client_count} / {t.free_client_limit} clientes
                </span>
              </div>

              <div className="flex items-center justify-between mt-[14px] pt-[12px] border-t border-line">
                <div>
                  <p className="text-[13px] font-medium text-ink-1">
                    Gratis siempre
                  </p>
                  <p className="text-[11px] text-ink-2">
                    No paga ni ve el bloqueo
                  </p>
                </div>
                <Switch
                  checked={t.billing_exempt}
                  disabled={pending && busyId === t.id}
                  onCheckedChange={(v: boolean) => toggleExempt(t, v)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
