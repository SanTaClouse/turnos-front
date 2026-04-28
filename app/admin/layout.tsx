import { BottomNav } from "@/components/admin/bottom-nav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex flex-col bg-bg"
      style={{ height: "100dvh", maxWidth: 430, margin: "0 auto", position: "relative" }}
    >
      <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
      <BottomNav />
    </div>
  );
}
