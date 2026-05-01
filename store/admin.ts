"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface AdminStore {
  selectedDate: string;       // YYYY-MM-DD
  viewMode: "day" | "week";
  resourceFilter: string;     // "all" | resource id

  setDate: (date: string) => void;
  shiftDate: (days: number) => void;
  setViewMode: (mode: "day" | "week") => void;
  setResourceFilter: (id: string) => void;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function shiftDateStr(date: string, days: number) {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

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
      shiftDate: (days) => set((s) => ({ selectedDate: shiftDateStr(s.selectedDate, days) })),
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
