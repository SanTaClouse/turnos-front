"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";

const tabs = [
  { id: "agenda",   label: "Agenda",   icon: "calendar" as const, href: "/admin/agenda" },
  { id: "clientes", label: "Clientes", icon: "user"     as const, href: "/admin/clientes" },
  { id: "servicios",label: "Servicios",icon: "scissors" as const, href: "/admin/servicios" },
  { id: "ajustes",  label: "Ajustes",  icon: "settings" as const, href: "/admin/ajustes" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-shrink-0 bg-bg border-t border-line flex gap-1 px-[12px] pt-[8px] pb-[4px]">
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className="press-fx flex-1 flex flex-col items-center gap-[3px] py-[8px] px-[4px] pb-[6px]"
            style={{ color: active ? "var(--ink-1)" : "var(--ink-3)" }}
          >
            <Icon
              name={tab.icon}
              size={20}
              color={active ? "var(--ink-1)" : "var(--ink-3)"}
              strokeWidth={active ? 2.2 : 1.8}
            />
            <span className="text-[10px] font-medium" style={{ fontWeight: active ? 600 : 500, letterSpacing: -0.1 }}>
              {tab.label}
            </span>
            {active && (
              <span className="w-[4px] h-[4px] rounded-full bg-ink-1 -mt-[2px]" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
