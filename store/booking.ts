"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface BookingChoice {
  serviceId: string | null;
  serviceName: string | null;
  serviceDuration: number | null;
  servicePrice: number | null;
  date: string | null;
  time: string | null;
  resourceId: string | null;
  resourceName: string | null;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  notes: string;
}

// Snapshot que persiste después de confirmar para la pantalla de éxito
export interface ConfirmedSnapshot extends BookingChoice {
  appointmentId: string;
  tenantName: string;
  tenantAddress: string | null;
  tenantInitials: string;
  confirmedAt: string;
}

interface BookingStore extends BookingChoice {
  step: number;
  confirmed: ConfirmedSnapshot | null;

  setService: (id: string, name: string, duration: number, price: number | null) => void;
  setDate: (date: string) => void;
  setTime: (time: string, resourceId: string, resourceName: string) => void;
  setDetails: (name: string, phone: string, email: string, notes: string) => void;
  nextStep: () => void;
  goToStep: (step: number) => void;
  confirm: (appointmentId: string, tenantName: string, tenantAddress: string | null, tenantInitials: string) => void;
  reset: () => void;
}

const initialChoice: BookingChoice = {
  serviceId: null,
  serviceName: null,
  serviceDuration: null,
  servicePrice: null,
  date: null,
  time: null,
  resourceId: null,
  resourceName: null,
  clientName: "",
  clientPhone: "",
  clientEmail: "",
  notes: "",
};

export const useBookingStore = create<BookingStore>()(
  persist(
    (set, get) => ({
      step: 0,
      confirmed: null,
      ...initialChoice,

      setService: (id, name, duration, price) =>
        set({ serviceId: id, serviceName: name, serviceDuration: duration, servicePrice: price }),

      setDate: (date) => set({ date }),

      setTime: (time, resourceId, resourceName) =>
        set({ time, resourceId, resourceName }),

      setDetails: (clientName, clientPhone, clientEmail, notes) =>
        set({ clientName, clientPhone, clientEmail, notes }),

      nextStep: () => set((s) => ({ step: s.step + 1 })),

      goToStep: (step) => set({ step }),

      confirm: (appointmentId, tenantName, tenantAddress, tenantInitials) => {
        const s = get();
        set({
          confirmed: {
            appointmentId,
            tenantName,
            tenantAddress,
            tenantInitials,
            confirmedAt: new Date().toISOString(),
            serviceId: s.serviceId,
            serviceName: s.serviceName,
            serviceDuration: s.serviceDuration,
            servicePrice: s.servicePrice,
            date: s.date,
            time: s.time,
            resourceId: s.resourceId,
            resourceName: s.resourceName,
            clientName: s.clientName,
            clientPhone: s.clientPhone,
            clientEmail: s.clientEmail,
            notes: s.notes,
          },
          step: 0,
          ...initialChoice,
        });
      },

      reset: () => set({ step: 0, confirmed: null, ...initialChoice }),
    }),
    {
      name: "turnosapp-booking",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
