"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Users } from "lucide-react";
import { setTenantBillingAction, logoutPlatformAction } from "./actions";
import type { PlatformTenantRow } from "@/types/api";

/**
 * Toggle propio con los tokens del proyecto (accent/line). No usamos el Switch
 * de components/ui porque depende de colores de shadcn que no están definidos
 * en globals.css y queda invisible.
 */
function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative inline-flex w-[46px] h-[28px] rounded-full transition-colors disabled:opacity-40 flex-shrink-0"
      style={{ backgroundColor: checked ? "var(--accent)" : "var(--line-2)" }}
    >
      <span
        className="absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white shadow transition-all"
        style={{ left: checked ? "21px" : "3px" }}
      />
    </button>
  );
}

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
  // Valor del input de cupo por tenant (string para permitir edición libre).
  const [limitDraft, setLimitDraft] = useState<Record<string, string>>({});

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

  function saveLimit(t: PlatformTenantRow) {
    const raw = limitDraft[t.id];
    const value = parseInt(raw ?? "", 10);
    if (Number.isNaN(value) || value < 0) return;
    setBusyId(t.id);
    startTransition(async () => {
      try {
        await setTenantBillingAction(t.id, { free_client_limit: value });
        setLimitDraft((d) => {
          const next = { ...d };
          delete next[t.id];
          return next;
        });
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
                    Cupo gratis
                  </p>
                  <p className="text-[11px] text-ink-2">
                    Clientes antes de cobrar
                  </p>
                </div>
                <div className="flex items-center gap-[8px]">
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={limitDraft[t.id] ?? String(t.free_client_limit)}
                    onChange={(e) =>
                      setLimitDraft((d) => ({ ...d, [t.id]: e.target.value }))
                    }
                    className="w-[64px] h-[36px] rounded border border-line bg-bg px-[10px] text-[14px] text-ink-1 text-center outline-none focus:border-ink-1"
                  />
                  <button
                    onClick={() => saveLimit(t)}
                    disabled={
                      (pending && busyId === t.id) ||
                      limitDraft[t.id] === undefined ||
                      limitDraft[t.id] === String(t.free_client_limit)
                    }
                    className="h-[36px] px-[14px] rounded bg-ink-1 text-bg text-[13px] font-medium disabled:opacity-30"
                  >
                    Guardar
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mt-[12px] pt-[12px] border-t border-line">
                <div>
                  <p className="text-[13px] font-medium text-ink-1">
                    Gratis siempre
                  </p>
                  <p className="text-[11px] text-ink-2">
                    No paga ni ve el bloqueo
                  </p>
                </div>
                <Toggle
                  checked={t.billing_exempt}
                  disabled={pending && busyId === t.id}
                  onChange={(v) => toggleExempt(t, v)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
