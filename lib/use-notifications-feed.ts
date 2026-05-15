"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Appointment } from "@/types/api";

const LAST_SEEN_KEY = (tenantId: string) => `notif_last_seen_${tenantId}`;

/**
 * Un turno está "vencido" cuando su hora de fin (o de inicio si no hay fin)
 * ya pasó. Lo usamos para no permitir confirmar turnos que ya ocurrieron y
 * para que no inflen el badge de notificaciones nuevas.
 */
export function isAppointmentPast(
  appt: Pick<Appointment, "date" | "end_time" | "time">,
): boolean {
  const end = appt.end_time || appt.time;
  if (!appt.date || !end) return false;
  const [y, mo, d] = appt.date.split("-").map(Number);
  const [h, m] = end.split(":").map(Number);
  if (!y || !mo || !d || Number.isNaN(h) || Number.isNaN(m)) return false;
  return new Date(y, mo - 1, d, h, m).getTime() <= Date.now();
}

/**
 * Feed unificado de notificaciones para el admin.
 *
 * - Hace polling al endpoint /appointments/recent en background (30s) para
 *   que el badge de la campana refleje actividad nueva sin tener que abrir
 *   el dropdown.
 * - "Nueva" = creada después del último `markAllSeen()` (persistido en
 *   localStorage por tenant), no cancelada y todavía no vencida. Así el
 *   número del badge representa cosas que el admin realmente puede accionar.
 * - Expone la mutation de confirmación para que el dropdown la consuma sin
 *   duplicar lógica.
 */
export function useNotificationsFeed(
  tenantId: string,
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled !== false && !!tenantId;
  const qc = useQueryClient();

  const [lastSeen, setLastSeen] = useState<number>(0);

  // Hidratamos lastSeen desde localStorage en cliente. SSR-safe.
  useEffect(() => {
    if (typeof window === "undefined" || !tenantId) {
      setLastSeen(0);
      return;
    }
    const stored = window.localStorage.getItem(LAST_SEEN_KEY(tenantId));
    setLastSeen(stored ? Number(stored) || 0 : 0);
  }, [tenantId]);

  const query = useQuery({
    queryKey: ["appointments-recent", tenantId],
    queryFn: () =>
      api.get<Appointment[]>(
        `/appointments/recent?tenantId=${tenantId}&limit=20`,
      ),
    enabled,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    staleTime: 5_000,
  });

  const recent = useMemo(() => query.data ?? [], [query.data]);

  // Tick para que `isAppointmentPast` se reevalúe sin esperar al próximo
  // refetch (un turno puede vencer mientras el admin tiene la app abierta).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const newCount = useMemo(() => {
    if (!recent.length) return 0;
    return recent.reduce((acc, a) => {
      const createdMs = a.created_at ? new Date(a.created_at).getTime() : 0;
      if (createdMs <= lastSeen) return acc;
      if (a.status === "cancelled") return acc;
      if (isAppointmentPast(a)) return acc;
      return acc + 1;
    }, 0);
    // `now` participa para forzar re-cálculo cuando el tick avanza.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recent, lastSeen, now]);

  const markAllSeen = useCallback(() => {
    const ts = Date.now();
    setLastSeen(ts);
    if (typeof window !== "undefined" && tenantId) {
      window.localStorage.setItem(LAST_SEEN_KEY(tenantId), String(ts));
    }
  }, [tenantId]);

  const confirmMutation = useMutation({
    mutationFn: (id: string) =>
      api.patch<Appointment>(`/appointments/${id}/confirm`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["appointments-recent", tenantId] });
      void qc.invalidateQueries({ queryKey: ["appointments", tenantId] });
    },
  });

  return {
    recent,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    newCount,
    markAllSeen,
    confirmMutation,
  };
}
