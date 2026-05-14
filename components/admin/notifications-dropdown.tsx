"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Appointment } from "@/types/api";
import { Icon } from "@/components/ui/icon";
import { StatusPill, SourcePill } from "@/components/ui/status-pill";

interface NotificationsDropdownProps {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  isPushEnabled: boolean;
  onEnablePush: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}

/**
 * Dropdown de notificaciones del admin.
 *
 * Es el fallback principal cuando el push del browser no llega (caso típico
 * en desktop con Focus Assist / permisos / SW dormido). El admin abre el
 * dropdown y ve los últimos turnos creados, con botón para confirmar inline
 * los que estén pendientes.
 */
export function NotificationsDropdown({
  open,
  onClose,
  tenantId,
  isPushEnabled,
  onEnablePush,
  anchorRef,
}: NotificationsDropdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  // Cerrar con Esc o click afuera
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open, onClose, anchorRef]);

  const { data: recent = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["appointments-recent", tenantId],
    queryFn: () =>
      api.get<Appointment[]>(
        `/appointments/recent?tenantId=${tenantId}&limit=20`,
      ),
    enabled: open && !!tenantId,
    // El dropdown se abre on-demand, así que refrescamos cada vez que se
    // abre y mantenemos un polling corto mientras esté abierto.
    refetchOnMount: "always",
    refetchInterval: open ? 15_000 : false,
    staleTime: 5_000,
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) =>
      api.patch<Appointment>(`/appointments/${id}/confirm`, {}),
    onSuccess: () => {
      // Invalidar tanto el feed del dropdown como las queries de la agenda.
      void qc.invalidateQueries({ queryKey: ["appointments-recent", tenantId] });
      void qc.invalidateQueries({ queryKey: ["appointments", tenantId] });
    },
  });

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay mobile-only — en desktop la popover es libre */}
          <motion.div
            key="notif-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="md:hidden fixed inset-0 bg-ink-1/30 z-[90]"
          />
          <motion.div
            key="notif-panel"
            ref={containerRef}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="fixed md:absolute z-[100] flex flex-col bg-bg border border-line rounded-[14px] shadow-[0_10px_40px_rgba(0,0,0,0.18)]"
            style={{
              top: "calc(var(--notif-top, 64px))",
              right: "12px",
              width: "min(380px, calc(100vw - 24px))",
              maxHeight: "min(560px, calc(100vh - 80px))",
            }}
            role="dialog"
            aria-label="Notificaciones"
          >
            {/* Header */}
            <div className="flex items-center gap-[10px] px-[16px] pt-[14px] pb-[10px] flex-shrink-0 border-b border-line-2">
              <Icon name="bell" size={16} color="var(--ink-1)" />
              <span className="text-[14px] font-semibold text-ink-1 flex-1">
                Notificaciones
              </span>
              <button
                onClick={() => void refetch()}
                className="press-fx text-[11px] font-mono uppercase tracking-[0.08em] text-ink-3 hover:text-ink-1"
                style={{ background: "transparent", border: 0, cursor: "pointer", padding: "4px 6px" }}
                title="Refrescar"
              >
                Refrescar
              </button>
              <button
                onClick={onClose}
                className="w-[28px] h-[28px] rounded-full bg-line-2 flex items-center justify-center"
                aria-label="Cerrar"
                style={{ border: 0, cursor: "pointer" }}
              >
                <Icon name="close" size={13} color="var(--ink-1)" />
              </button>
            </div>

            {/* Push CTA banner */}
            {!isPushEnabled && (
              <button
                onClick={() => {
                  onEnablePush();
                }}
                className="press-fx flex items-center gap-[10px] mx-[12px] mt-[10px] px-[12px] py-[10px] rounded-[10px] text-left"
                style={{
                  background: "var(--ink-1)",
                  color: "var(--bg)",
                  border: 0,
                  cursor: "pointer",
                }}
                type="button"
              >
                <Icon name="bell" size={14} color="var(--bg)" />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold leading-[1.2]">
                    Habilitar notificaciones push
                  </div>
                  <div className="text-[10.5px] opacity-70 mt-[2px] leading-[1.3]">
                    Recibí avisos al instante cuando alguien reserve.
                  </div>
                </div>
                <Icon name="chevronRight" size={13} color="var(--bg)" />
              </button>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto hide-scroll px-[10px] py-[8px]">
              {isLoading && (
                <div className="flex flex-col gap-[6px] p-[2px]">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-[64px] rounded-[10px] bg-line-2 animate-pulse" />
                  ))}
                </div>
              )}

              {isError && !isLoading && (
                <div className="text-[12px] text-ink-3 text-center py-[24px] px-[16px]">
                  No pudimos cargar las notificaciones.
                  <button
                    onClick={() => void refetch()}
                    className="block mx-auto mt-[8px] text-[12px] underline text-ink-1"
                    style={{ background: "transparent", border: 0, cursor: "pointer" }}
                  >
                    Reintentar
                  </button>
                </div>
              )}

              {!isLoading && !isError && recent.length === 0 && (
                <div className="text-[12px] text-ink-3 text-center py-[28px] px-[16px]">
                  Todavía no hay actividad reciente.
                </div>
              )}

              {!isLoading && !isError && recent.length > 0 && (
                <ul className="flex flex-col gap-[4px]">
                  {recent.map((a) => (
                    <NotificationItem
                      key={a.id}
                      appt={a}
                      onConfirm={() => confirmMutation.mutate(a.id)}
                      confirming={
                        confirmMutation.isPending &&
                        confirmMutation.variables === a.id
                      }
                    />
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 border-t border-line-2 px-[14px] py-[10px] flex items-center justify-between">
              <span className="text-[10.5px] font-mono uppercase tracking-[0.08em] text-ink-3">
                Últimos {recent.length || 0} turnos
              </span>
              <a
                href="/admin/agenda"
                onClick={onClose}
                className="text-[12px] font-medium text-ink-1 underline underline-offset-4"
              >
                Ver agenda
              </a>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function NotificationItem({
  appt,
  onConfirm,
  confirming,
}: {
  appt: Appointment;
  onConfirm: () => void;
  confirming: boolean;
}) {
  const created = appt.created_at ? new Date(appt.created_at) : null;
  return (
    <li
      className="rounded-[10px] px-[12px] py-[10px] flex flex-col gap-[6px]"
      style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
    >
      <div className="flex items-center gap-[8px] flex-wrap">
        <span className="text-[13px] font-semibold text-ink-1 truncate flex-1 min-w-0">
          {appt.client?.name ?? "Cliente"}
        </span>
        <StatusPill status={appt.status} />
        <SourcePill source={appt.source} />
      </div>

      <div className="text-[11.5px] text-ink-2 leading-[1.3]">
        <span className="font-medium">{appt.service?.name ?? "Turno"}</span>
        <span className="text-ink-3"> · </span>
        <span className="font-mono">{formatDateShort(appt.date)} {appt.time}</span>
        {appt.resource?.name && (
          <>
            <span className="text-ink-3"> · </span>
            <span>{appt.resource.name}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-[10px]">
        <span className="text-[10.5px] font-mono text-ink-3 flex-1">
          {created ? formatRelative(created) : ""}
        </span>
        {appt.status === "pending" && (
          <button
            onClick={onConfirm}
            disabled={confirming}
            className="press-fx text-[11.5px] font-semibold px-[10px] py-[5px] rounded-[8px] inline-flex items-center gap-[5px] disabled:opacity-60"
            style={{
              background: "var(--ink-1)",
              color: "var(--bg)",
              border: 0,
              cursor: confirming ? "not-allowed" : "pointer",
            }}
            type="button"
          >
            {confirming ? (
              "Confirmando…"
            ) : (
              <>
                <Icon name="check" size={12} color="var(--bg)" />
                Confirmar
              </>
            )}
          </button>
        )}
      </div>
    </li>
  );
}

function formatDateShort(dateStr: string) {
  const today = new Date().toISOString().slice(0, 10);
  if (dateStr === today) return "Hoy";
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  if (dateStr === tomorrow) return "Mañana";
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${days[date.getDay()]} ${d} ${months[m - 1]}`;
}

function formatRelative(date: Date) {
  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "hace instantes";
  const min = Math.floor(sec / 60);
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `hace ${d} d`;
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}
