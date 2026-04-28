"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface AdminStore {
  tenantId: string;
  selectedDate: string;       // YYYY-MM-DD
  viewMode: "day" | "week";
  resourceFilter: string;     // "all" | resource id

  setTenantId: (id: string) => void;
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

export const useAdminStore = create<AdminStore>()(
  persist(
    (set) => ({
      tenantId: process.env.NEXT_PUBLIC_ADMIN_TENANT_ID ?? "",
      selectedDate: todayStr(),
      viewMode: "day",
      resourceFilter: "all",

      setTenantId: (tenantId) => set({ tenantId }),
      setDate: (selectedDate) => set({ selectedDate }),
      shiftDate: (days) => set((s) => ({ selectedDate: shiftDateStr(s.selectedDate, days) })),
      setViewMode: (viewMode) => set({ viewMode }),
      setResourceFilter: (resourceFilter) => set({ resourceFilter }),
    }),
    {
      name: "turnosapp-admin",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ tenantId: s.tenantId, viewMode: s.viewMode }),
    },
  ),
);
