"use client";

import { Icon } from "@/components/ui/icon";

interface FABProps {
  onClick: () => void;
}

export function FAB({ onClick }: FABProps) {
  return (
    <button
      onClick={onClick}
      className="press-fx absolute right-[20px] w-[56px] h-[56px] rounded-full bg-ink-1 flex items-center justify-center shadow-fab z-[40]"
      style={{ bottom: 90 }}
      aria-label="Crear turno"
    >
      <Icon name="plus" size={22} color="var(--bg)" strokeWidth={2.4} />
    </button>
  );
}
