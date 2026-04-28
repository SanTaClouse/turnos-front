"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface DraftService {
  name: string;
  duration_minutes: number;
  price: number | null;
}

export interface DraftResource {
  name: string;
  role?: string;
  hue: number;
}

interface OnboardingStore {
  step: number; // 0..6

  // Business
  businessName: string;
  category: string;
  whatsapp: string;
  address: string;

  // Services
  services: DraftService[];

  // Resources
  resources: DraftResource[];

  // Hours
  openHour: string;
  closeHour: string;
  workdays: number[]; // 0-6 (0=domingo)

  // Slug
  slug: string;

  // Result
  createdTenantId: string | null;

  // Actions
  setStep: (step: number) => void;
  next: () => void;
  prev: () => void;
  set: <K extends keyof OnboardingStore>(key: K, value: OnboardingStore[K]) => void;
  addService: (s: DraftService) => void;
  updateService: (index: number, patch: Partial<DraftService>) => void;
  removeService: (index: number) => void;
  addResource: (r: DraftResource) => void;
  updateResource: (index: number, patch: Partial<DraftResource>) => void;
  removeResource: (index: number) => void;
  toggleWorkday: (day: number) => void;
  reset: () => void;
}

const initial = {
  step: 0,
  businessName: "",
  category: "Barbería",
  whatsapp: "",
  address: "",
  services: [
    { name: "Corte de pelo", duration_minutes: 30, price: 8000 },
    { name: "Corte + barba", duration_minutes: 45, price: 12000 },
  ] as DraftService[],
  resources: [{ name: "Yo", role: "", hue: 24 }] as DraftResource[],
  openHour: "10:00",
  closeHour: "20:00",
  workdays: [1, 2, 3, 4, 5],
  slug: "",
  createdTenantId: null,
};

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      ...initial,

      setStep: (step) => set({ step }),
      next: () => set((s) => ({ step: Math.min(s.step + 1, 6) })),
      prev: () => set((s) => ({ step: Math.max(s.step - 1, 0) })),
      set: (key, value) => set({ [key]: value } as Partial<OnboardingStore>),

      addService: (s) => set((state) => ({ services: [...state.services, s] })),
      updateService: (i, patch) =>
        set((state) => ({
          services: state.services.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
        })),
      removeService: (i) =>
        set((state) => ({ services: state.services.filter((_, idx) => idx !== i) })),

      addResource: (r) => set((state) => ({ resources: [...state.resources, r] })),
      updateResource: (i, patch) =>
        set((state) => ({
          resources: state.resources.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
        })),
      removeResource: (i) =>
        set((state) => ({ resources: state.resources.filter((_, idx) => idx !== i) })),

      toggleWorkday: (day) =>
        set((state) => ({
          workdays: state.workdays.includes(day)
            ? state.workdays.filter((d) => d !== day)
            : [...state.workdays, day].sort(),
        })),

      reset: () => set(initial),
    }),
    {
      name: "turnosapp-onboarding",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
