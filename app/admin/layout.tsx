import type { Metadata } from "next";
import { BottomNav } from "@/components/admin/bottom-nav";
import { BillingGate } from "@/components/admin/billing-gate";
import { AdminInstallBanner } from "@/components/admin/admin-install-banner";
import { getBillingStatus } from "@/lib/billing";

// El manifest vive SOLO acá: la app instalable es el panel del tenant.
// Las páginas públicas (landing y reserva) no deben ofrecer "Instalar".
export const metadata: Metadata = {
  manifest: "/manifest.json",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Estado de facturación server-side: misma verdad para todos los dispositivos.
  const billing = await getBillingStatus();

  return (
    <div
      className="flex flex-col bg-bg"
      style={{ height: "100dvh", maxWidth: 430, margin: "0 auto", position: "relative" }}
    >
      <BillingGate status={billing}>
        <AdminInstallBanner />
        <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
        <BottomNav />
      </BillingGate>
    </div>
  );
}
