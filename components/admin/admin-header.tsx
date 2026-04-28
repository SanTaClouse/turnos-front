"use client";

import { Icon } from "@/components/ui/icon";

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  notifCount?: number;
  onNotifClick?: () => void;
  rightAction?: React.ReactNode;
}

export function AdminHeader({ title, subtitle, notifCount = 0, onNotifClick, rightAction }: AdminHeaderProps) {
  return (
    <div className="flex-shrink-0 px-[20px] pt-[8px] pb-[12px] bg-bg">
      <div className="flex items-center gap-[12px] min-h-[44px]">
        <div className="flex-1 min-w-0">
          {subtitle && (
            <div className="label-mono mb-[2px]">{subtitle}</div>
          )}
          <div className="font-serif text-screen-title" style={{ letterSpacing: "-0.5px", lineHeight: 1.05 }}>
            {title}
          </div>
        </div>
        {rightAction}
        {onNotifClick && (
          <button
            onClick={onNotifClick}
            className="press-fx relative w-[40px] h-[40px] rounded-full bg-surface border border-line flex items-center justify-center"
            aria-label="Notificaciones"
          >
            <Icon name="bell" size={18} color="var(--ink-1)" />
            {notifCount > 0 && (
              <span className="absolute top-[6px] right-[6px] min-w-[16px] h-[16px] px-[3px] rounded-full bg-accent text-white text-[9px] font-semibold flex items-center justify-center">
                {notifCount}
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
