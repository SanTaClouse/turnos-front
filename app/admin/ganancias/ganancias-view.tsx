"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import type {
  EarningsResult,
  EarningsPeriod,
  MonthlySummary,
  ExportPreview,
} from "@/types/api";
import { AdminHeader } from "@/components/admin/admin-header";
import { BottomSheet } from "@/components/admin/bottom-sheet";
import { Btn } from "@/components/ui/btn";
import { Icon } from "@/components/ui/icon";
import { ResourceAvatar } from "@/components/ui/resource-avatar";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function fmtMoney(n: number): string {
  if (n >= 1_000_000)
    return "$" + (n / 1_000_000).toFixed(1).replace(".", ",") + "M";
  if (n >= 1000) return "$" + Math.round(n / 1000) + "K";
  return "$" + Math.round(n);
}

function fmtMoneyFull(n: number): string {
  return "$" + Math.round(n).toLocaleString("es-AR");
}

function fmtShortDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  const months = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];
  return `${d} ${months[m - 1]}`;
}

interface GananciasViewProps {
  tenantId: string;
  initial: EarningsResult | null;
  summary: MonthlySummary | null;
}

export function GananciasView({
  tenantId,
  initial,
  summary,
}: GananciasViewProps) {
  const [period, setPeriod] = useState<EarningsPeriod>("semana");
  const [data, setData] = useState<EarningsResult | null>(initial);
  const [loading, setLoading] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  // Cambio de período: refetch sin recargar la página entera
  useEffect(() => {
    if (period === initial?.period && data === initial) return;
    let cancelled = false;
    setLoading(true);
    api
      .get<EarningsResult>(
        `/earnings/summary?tenantId=${tenantId}&period=${period}`,
      )
      .then((r) => {
        if (!cancelled) setData(r);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, tenantId]);

  const delta = useMemo(() => {
    if (!data || !data.prev) return null;
    return ((data.total - data.prev) / data.prev) * 100;
  }, [data]);

  return (
    <>
      <AdminHeader title="Ganancias" subtitle="Resumen" />

      {/* AI banner */}
      {summary && (
        <div className="px-[20px] pb-[12px] flex-shrink-0">
          <AiBanner summary={summary} onOpen={() => setAiOpen(true)} />
        </div>
      )}

      {/* Period toggle */}
      <div className="px-[20px] pb-[14px] flex-shrink-0">
        <PeriodToggle period={period} onChange={setPeriod} />
      </div>

      {/* Scroll body */}
      <div
        className="hide-scroll flex-1 overflow-y-auto px-[20px]"
        style={{ paddingBottom: 100 }}
      >
        {/* Big number */}
        <div className="py-[8px] pb-[18px] px-[4px]">
          <div
            className="font-mono"
            style={{
              fontSize: 10,
              color: "var(--ink-3)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            {data?.label ?? "—"}
          </div>
          <div
            className="font-serif"
            style={{
              fontSize: 56,
              lineHeight: 0.95,
              letterSpacing: "-1.5px",
              color: "var(--ink-1)",
              opacity: loading ? 0.5 : 1,
              transition: "opacity 0.15s",
            }}
          >
            {data ? fmtMoneyFull(data.total) : "$0"}
          </div>
          {delta !== null && (
            <DeltaPill delta={delta} />
          )}
        </div>

        {/* Bar chart */}
        {data && <BarChart data={data} />}

        {/* Por servicio */}
        {data && data.services.length > 0 && (
          <SectionBlock title="Por servicio" count={data.services.length}>
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius)",
                overflow: "hidden",
              }}
            >
              {data.services.map((s, i) => {
                const max = data.services[0].total || 1;
                const pct = (s.total / max) * 100;
                return (
                  <div
                    key={s.service_id ?? `idx-${i}`}
                    style={{
                      padding: "14px 16px",
                      borderBottom:
                        i < data.services.length - 1
                          ? "1px solid var(--line-2)"
                          : "none",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "space-between",
                        marginBottom: 6,
                        gap: 12,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 500,
                            letterSpacing: "-0.2px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {s.name}
                        </div>
                        <div
                          className="font-mono"
                          style={{
                            fontSize: 11,
                            color: "var(--ink-3)",
                            marginTop: 2,
                          }}
                        >
                          {s.count} servicios
                        </div>
                      </div>
                      <div
                        className="font-mono"
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "var(--ink-1)",
                        }}
                      >
                        {fmtMoney(s.total)}
                      </div>
                    </div>
                    <div
                      style={{
                        height: 4,
                        background: "var(--line-2)",
                        borderRadius: 2,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: pct + "%",
                          height: "100%",
                          background:
                            i === 0 ? "var(--accent)" : "var(--ink-1)",
                          borderRadius: 2,
                          opacity:
                            i === 0 ? 1 : Math.max(0.3, 1 - i * 0.2),
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionBlock>
        )}

        {/* Por profesional */}
        {data && data.pros.length > 0 && (
          <SectionBlock title="Por profesional" count={data.pros.length}>
            <div className="flex flex-col gap-[8px]">
              {data.pros.map((p, i) => {
                const max = data.pros[0].total || 1;
                const pct = (p.total / max) * 100;
                return (
                  <div
                    key={p.resource_id ?? `idx-${i}`}
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--line)",
                      borderRadius: "var(--radius)",
                      padding: "12px 14px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <ResourceAvatar
                        initials={getInitials(p.name)}
                        hue={p.hue}
                        size={40}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 500,
                              letterSpacing: "-0.2px",
                            }}
                          >
                            {p.name}
                          </div>
                          {i === 0 && (
                            <Icon name="crown" size={12} color="#c08a2e" />
                          )}
                        </div>
                        <div
                          className="font-mono"
                          style={{
                            fontSize: 11,
                            color: "var(--ink-3)",
                            marginTop: 2,
                          }}
                        >
                          {p.count} servicios
                        </div>
                      </div>
                      <div
                        className="font-mono"
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "var(--ink-1)",
                        }}
                      >
                        {fmtMoney(p.total)}
                      </div>
                    </div>
                    <div
                      style={{
                        height: 4,
                        background: "var(--line-2)",
                        borderRadius: 2,
                        overflow: "hidden",
                        marginTop: 10,
                      }}
                    >
                      <div
                        style={{
                          width: pct + "%",
                          height: "100%",
                          background: `oklch(0.65 0.10 ${p.hue})`,
                          borderRadius: 2,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionBlock>
        )}

        {/* Exportar */}
        {data && (
          <SectionBlock title="Exportar">
            <ExportCard
              tenantId={tenantId}
              range={data.range}
              periodLabel={data.label.toLowerCase()}
            />
          </SectionBlock>
        )}
      </div>

      {summary && (
        <AISummaryModal
          open={aiOpen}
          onClose={() => setAiOpen(false)}
          summary={summary}
        />
      )}
    </>
  );
}

// ──────────── AI Banner ────────────

function AiBanner({
  summary,
  onOpen,
}: {
  summary: MonthlySummary;
  onOpen: () => void;
}) {
  const monthLabel = formatMonth(summary.month);
  return (
    <button
      onClick={onOpen}
      className="press-fx w-full text-left relative overflow-hidden"
      style={{
        background: "var(--ink-1)",
        color: "var(--bg)",
        border: 0,
        borderRadius: "var(--radius)",
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(140% 80% at 100% 0%, rgba(232,114,90,0.25), transparent 60%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: "rgba(232,114,90,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          position: "relative",
        }}
      >
        <Icon name="sparkle" size={18} color="var(--accent)" />
      </div>
      <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
        <div
          className="font-mono"
          style={{
            fontSize: 9,
            color: "rgba(250,249,247,0.55)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Resumen con IA · Disponible
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            marginTop: 3,
            letterSpacing: "-0.2px",
          }}
        >
          Tu mes de {monthLabel}, analizado
        </div>
      </div>
      <div style={{ position: "relative" }}>
        <Icon name="chevronRight" size={16} color="var(--bg)" />
      </div>
    </button>
  );
}

// ──────────── Period toggle ────────────

function PeriodToggle({
  period,
  onChange,
}: {
  period: EarningsPeriod;
  onChange: (p: EarningsPeriod) => void;
}) {
  const items: Array<{ id: EarningsPeriod; label: string }> = [
    { id: "dia", label: "Día" },
    { id: "semana", label: "Semana" },
    { id: "mes", label: "Mes" },
  ];
  return (
    <div
      style={{
        display: "flex",
        background: "var(--line-2)",
        borderRadius: 12,
        padding: 3,
        gap: 0,
      }}
    >
      {items.map((p) => (
        <button
          key={p.id}
          onClick={() => onChange(p.id)}
          className="press-fx"
          style={{
            flex: 1,
            padding: "9px 0",
            border: 0,
            background:
              period === p.id ? "var(--surface)" : "transparent",
            borderRadius: 9,
            fontSize: 13,
            fontWeight: 500,
            fontFamily: "inherit",
            color: period === p.id ? "var(--ink-1)" : "var(--ink-2)",
            cursor: "pointer",
            boxShadow:
              period === p.id ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
            transition: "all 0.15s",
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

// ──────────── Delta pill ────────────

function DeltaPill({ delta }: { delta: number }) {
  const positive = delta >= 0;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        marginTop: 10,
        padding: "4px 10px 4px 8px",
        background: positive ? "var(--status-confirmed-bg)" : "#fdece7",
        color: positive ? "var(--status-confirmed)" : "#c45a3c",
        borderRadius: 99,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          transform: positive ? "none" : "rotate(180deg)",
        }}
      >
        <Icon
          name="arrowUp"
          size={12}
          color={positive ? "var(--status-confirmed)" : "#c45a3c"}
        />
      </span>
      <span
        className="font-mono"
        style={{ fontSize: 11, letterSpacing: "-0.1px" }}
      >
        {positive ? "+" : ""}
        {delta.toFixed(1)}%
      </span>
      <span style={{ color: "var(--ink-3)", fontWeight: 400, fontSize: 11 }}>
        vs anterior
      </span>
    </div>
  );
}

// ──────────── Bar chart ────────────

function BarChart({ data }: { data: EarningsResult }) {
  const max = Math.max(0, ...data.breakdown);
  const isMonth = data.period === "mes";
  const showLabelEvery = isMonth ? 5 : 1;

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
        padding: "16px 16px 14px",
        marginBottom: 8,
      }}
    >
      <div
        className="font-mono"
        style={{
          fontSize: 10,
          color: "var(--ink-3)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: 14,
        }}
      >
        Evolución
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: isMonth ? 2 : 4,
          height: 100,
        }}
      >
        {data.breakdown.map((v, i) => {
          const pct = max > 0 ? (v / max) * 100 : 0;
          const isTop = v === max && v > 0;
          const isLast = i === data.breakdown.length - 1;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 6,
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: Math.max(2, pct * 0.82) + "%",
                  background:
                    v === 0
                      ? "var(--line-2)"
                      : isTop
                      ? "var(--accent)"
                      : isLast
                      ? "var(--ink-1)"
                      : "var(--line)",
                  borderRadius: 3,
                  minHeight: 2,
                  transition: "height 0.3s",
                }}
              />
              {(!isMonth || i % showLabelEvery === 0) && (
                <div
                  className="font-mono"
                  style={{
                    fontSize: 9,
                    color: "var(--ink-3)",
                    fontWeight: v === max ? 600 : 400,
                  }}
                >
                  {data.labels[i]}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ──────────── Section block ────────────

function SectionBlock({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          padding: "8px 4px 10px",
        }}
      >
        <div
          className="font-mono"
          style={{
            fontSize: 10,
            color: "var(--ink-3)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {title}
        </div>
        {count !== undefined && (
          <div
            className="font-mono"
            style={{ fontSize: 10, color: "var(--ink-3)" }}
          >
            · {count}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

// ──────────── Export card ────────────

function ExportCard({
  tenantId,
  range,
  periodLabel,
}: {
  tenantId: string;
  range: { from: string; to: string };
  periodLabel: string;
}) {
  const [preview, setPreview] = useState<ExportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<ExportPreview>(
        `/exports/appointments/preview?tenantId=${tenantId}&from=${range.from}&to=${range.to}`,
      )
      .then((p) => {
        if (!cancelled) setPreview(p);
      })
      .catch(() => {
        if (!cancelled) setPreview(null);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId, range.from, range.to]);

  const dup = preview?.duplicates;
  const lastExport = dup?.exactRange ?? dup?.exactRows ?? null;

  const handleDownload = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      // Streaming binario — fetch + Blob + URL temporal.
      // confirm=true porque al usuario ya le mostramos el aviso de duplicado.
      const url =
        `${API_BASE}/exports/appointments.xlsx` +
        `?tenantId=${tenantId}` +
        `&from=${range.from}&to=${range.to}` +
        (lastExport ? `&confirm=true` : "");
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        const msg = await res
          .json()
          .then((j) => j.message)
          .catch(() => `HTTP ${res.status}`);
        throw new Error(typeof msg === "string" ? msg : "Error al exportar");
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      const cd = res.headers.get("content-disposition") ?? "";
      const match = cd.match(/filename="([^"]+)"/);
      a.download = match?.[1] ?? `turnos-${range.from}_${range.to}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);

      // Refetch preview para que el aviso de "ya exportado" aparezca.
      const fresh = await api.get<ExportPreview>(
        `/exports/appointments/preview?tenantId=${tenantId}&from=${range.from}&to=${range.to}`,
      );
      setPreview(fresh);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al exportar");
    } finally {
      setBusy(false);
    }
  }, [tenantId, range.from, range.to, lastExport]);

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
        padding: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: "var(--line-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon name="file" size={17} color="var(--ink-2)" />
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: "-0.2px",
            }}
          >
            Servicios de {periodLabel}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--ink-3)",
              marginTop: 3,
              lineHeight: 1.4,
            }}
          >
            Planilla Excel con detalle de turnos, clientes, profesional, precio.
          </div>
          {preview && (
            <div
              className="font-mono"
              style={{
                fontSize: 10,
                color: "var(--ink-3)",
                marginTop: 6,
                letterSpacing: "0.05em",
              }}
            >
              {preview.rowCount} turnos · {fmtMoney(preview.totalRevenue)}
            </div>
          )}
        </div>
      </div>

      {lastExport && (
        <div
          style={{
            padding: "8px 12px",
            background: "#fbf3de",
            color: "#8a6a1a",
            borderRadius: 8,
            fontSize: 11,
            lineHeight: 1.4,
            marginBottom: 10,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Icon name="alert" size={13} color="#8a6a1a" />
          <span>
            Este rango ya fue exportado el{" "}
            {fmtShortDate(lastExport.created_at.slice(0, 10))}.
          </span>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "8px 12px",
            background: "#fdece7",
            color: "#c45a3c",
            borderRadius: 8,
            fontSize: 11,
            lineHeight: 1.4,
            marginBottom: 10,
          }}
        >
          {error}
        </div>
      )}

      <Btn
        variant={lastExport ? "secondary" : "primary"}
        size="md"
        loading={busy}
        onClick={handleDownload}
      >
        <Icon name="download" size={15} />
        {lastExport ? "Exportar de nuevo" : "Descargar Excel"}
      </Btn>
    </div>
  );
}

// ──────────── AI Summary Modal ────────────

function AISummaryModal({
  open,
  onClose,
  summary,
}: {
  open: boolean;
  onClose: () => void;
  summary: MonthlySummary;
}) {
  const monthLabel = formatMonth(summary.month, "long");
  const deltaPct = summary.hero.delta_pct;
  return (
    <BottomSheet open={open} onClose={onClose} title="Tu mes en números">
      <div style={{ marginTop: -4 }}>
        {/* Hero */}
        <div
          style={{
            background: "linear-gradient(135deg, #1a1a18 0%, #2a2926 100%)",
            color: "var(--bg)",
            borderRadius: "var(--radius)",
            padding: "22px 20px",
            marginBottom: 18,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -40,
              right: -40,
              width: 160,
              height: 160,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(232,114,90,0.4), transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <div style={{ position: "relative" }}>
            <div
              className="font-mono"
              style={{
                fontSize: 10,
                color: "rgba(250,249,247,0.55)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 8,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Icon name="sparkle" size={11} color="var(--accent)" />
              Análisis con IA · {monthLabel}
            </div>
            <div
              className="font-serif"
              style={{
                fontSize: 38,
                lineHeight: 0.95,
                letterSpacing: "-1px",
              }}
            >
              <span style={{ color: "var(--accent)", fontStyle: "italic" }}>
                {fmtMoney(summary.hero.revenue)}
              </span>
              <br />
              en ganancias.
            </div>
            <div
              style={{
                fontSize: 13,
                color: "rgba(250,249,247,0.7)",
                marginTop: 10,
              }}
            >
              {deltaPct !== null && (
                <>
                  {deltaPct >= 0 ? "+" : ""}
                  {deltaPct.toFixed(1)}% vs mes anterior ·{" "}
                </>
              )}
              {summary.hero.appointments} servicios completados
            </div>
          </div>
        </div>

        {/* Insights */}
        {summary.insights.map((ins, i) => (
          <InsightCard key={i} insight={ins} />
        ))}

        <div
          style={{
            padding: "12px 14px",
            background: "var(--line-2)",
            borderRadius: 12,
            fontSize: 11,
            color: "var(--ink-3)",
            lineHeight: 1.5,
            marginTop: 14,
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
          }}
        >
          <Icon name="shield" size={13} color="var(--ink-3)" />
          <span>
            Resumen generado el {fmtShortDate(summary.generated_at.slice(0, 10))}.
            Próximo análisis: 1° del mes próximo.
          </span>
        </div>
      </div>
    </BottomSheet>
  );
}

function InsightCard({
  insight,
}: {
  insight: MonthlySummary["insights"][number];
}) {
  const safeIcon = isKnownIcon(insight.icon) ? insight.icon : "sparkle";
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
        padding: "14px 16px",
        marginBottom: 10,
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          background: insight.accentBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon name={safeIcon} size={15} color={insight.accent} />
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "-0.1px",
            color: "var(--ink-1)",
            marginBottom: 3,
          }}
        >
          {insight.title}
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--ink-2)",
            lineHeight: 1.5,
          }}
        >
          {insight.body}
        </div>
      </div>
    </div>
  );
}

function isKnownIcon(
  name: string,
): name is React.ComponentProps<typeof Icon>["name"] {
  return [
    "crown",
    "trending",
    "calendar",
    "alert",
    "user",
    "clock",
    "sparkle",
    "star",
    "check",
    "chart",
  ].includes(name);
}

function formatMonth(yyyyMM: string, variant: "short" | "long" = "short") {
  const [y, m] = yyyyMM.split("-").map(Number);
  const longNames = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  if (variant === "long") return `${longNames[m - 1]} ${y}`;
  return longNames[m - 1];
}
