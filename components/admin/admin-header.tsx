"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { NotificationsDropdown } from "@/components/admin/notifications-dropdown";

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  /** Cantidad de turnos pendientes — se muestra como badge sobre la campana. */
  notifCount?: number;
  rightAction?: React.ReactNode;
  /**
   * Si se pasa tenantId, el header habilita el dropdown de notificaciones
   * anclado a la campana. Sin tenantId, no se muestra la campana.
   */
  tenantId?: string;
  /** Si el push está habilitado, se muestra la campana con acento. */
  isPushEnabled?: boolean;
  /** Solicita permiso de push y registra suscripción. */
  onEnablePushNotifications?: () => void;
}

export function AdminHeader({
  title,
  subtitle,
  notifCount = 0,
  rightAction,
  tenantId,
  isPushEnabled,
  onEnablePushNotifications,
}: AdminHeaderProps) {
  const [open, setOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="flex-shrink-0 px-[20px] pt-[8px] pb-[12px] bg-bg relative">
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
        {tenantId && (
          <button
            ref={bellRef}
            onClick={() => setOpen((v) => !v)}
            className="press-fx relative w-[40px] h-[40px] rounded-full bg-surface border border-line flex items-center justify-center"
            aria-label="Notificaciones"
            aria-expanded={open}
            title={isPushEnabled ? "Notificaciones (push activo)" : "Notificaciones"}
          >
            <Icon
              name="bell"
              size={18}
              color={isPushEnabled ? "var(--accent)" : "var(--ink-1)"}
            />
            {notifCount > 0 && (
              <span className="absolute top-[6px] right-[6px] min-w-[16px] h-[16px] px-[3px] rounded-full bg-accent text-white text-[9px] font-semibold flex items-center justify-center">
                {notifCount > 99 ? "99+" : notifCount}
              </span>
            )}
            {/* Punto sutil cuando push no está habilitado, para invitar al usuario a abrir el dropdown */}
            {!isPushEnabled && notifCount === 0 && (
              <span
                className="absolute top-[8px] right-[8px] w-[7px] h-[7px] rounded-full"
                style={{ background: "var(--status-pending)" }}
                aria-hidden
              />
            )}
          </button>
        )}
      </div>

      {tenantId && (
        <NotificationsDropdown
          open={open}
          onClose={() => setOpen(false)}
          tenantId={tenantId}
          isPushEnabled={!!isPushEnabled}
          onEnablePush={() => {
            onEnablePushNotifications?.();
          }}
          anchorRef={bellRef}
        />
      )}
    </div>
  );
}
