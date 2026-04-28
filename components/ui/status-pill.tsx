import { cn } from "@/lib/utils";

type Status = "pending" | "confirmed" | "cancelled";
type Source = "whatsapp" | "web" | "manual";

const statusConfig: Record<Status, { label: string; bg: string; color: string }> = {
  pending: { label: "Pendiente", bg: "var(--status-pending-bg)", color: "var(--status-pending)" },
  confirmed: { label: "Confirmado", bg: "var(--status-confirmed-bg)", color: "var(--status-confirmed)" },
  cancelled: { label: "Cancelado", bg: "var(--status-cancelled-bg)", color: "var(--ink-3)" },
};

const sourceConfig: Record<Source, { label: string }> = {
  whatsapp: { label: "WhatsApp" },
  web: { label: "Web" },
  manual: { label: "Manual" },
};

interface StatusPillProps {
  status: Status;
  className?: string;
}

interface SourcePillProps {
  source: Source;
  className?: string;
}

export function StatusPill({ status, className }: StatusPillProps) {
  const { label, bg, color } = statusConfig[status];
  return (
    <span
      className={cn("font-mono text-[10px] font-semibold uppercase tracking-[0.1em] px-2 py-0.5 rounded-full", className)}
      style={{ background: bg, color }}
    >
      {label}
    </span>
  );
}

export function SourcePill({ source, className }: SourcePillProps) {
  const { label } = sourceConfig[source];
  return (
    <span
      className={cn("font-mono text-[10px] font-medium uppercase tracking-[0.1em] px-2 py-0.5 rounded-full", className)}
      style={{ background: "var(--line-2)", color: "var(--ink-3)" }}
    >
      {label}
    </span>
  );
}
