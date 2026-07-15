"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { addDays, todayLocal } from "@/lib/timezone-utils";

interface AdminStore {
  selectedDate: string;       // YYYY-MM-DD
  viewMode: "day" | "week";
  resourceFilter: string;     // "all" | resource id

  setDate: (date: string) => void;
  shiftDate: (days: number) => void;
  setViewMode: (mode: "day" | "week") => void;
  setResourceFilter: (id: string) => void;
}

// Default inicial del día seleccionado. Usa la fecha LOCAL del navegador (no UTC),
// así no salta a "mañana" de noche. AgendaView la reconcilia en el montaje a la
// fecha de hoy en la zona horaria del negocio (tenant.timezone), que es la
// fuente de verdad final.
const todayStr = todayLocal;

// Nota: tenantId se removió de este store. La fuente de verdad del tenant
// es la cookie httpOnly de sesión, leída en server components vía
// getSession(). Pasar tenantId como prop a los componentes que lo necesiten.
export const useAdminStore = create<AdminStore>()(
  persist(
    (set) => ({
      selectedDate: todayStr(),
      viewMode: "day",
      resourceFilter: "all",

      setDate: (selectedDate) => set({ selectedDate }),
      shiftDate: (days) => set((s) => ({ selectedDate: addDays(s.selectedDate, days) })),
      setViewMode: (viewMode) => set({ viewMode }),
      setResourceFilter: (resourceFilter) => set({ resourceFilter }),
    }),
    {
      name: "turnosapp-admin",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ viewMode: s.viewMode }),
    },
  ),
);
