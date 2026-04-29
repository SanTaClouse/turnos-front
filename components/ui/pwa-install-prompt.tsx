"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePWAInstall } from "@/lib/use-pwa-install";
import { Btn } from "@/components/ui/btn";
import { Icon } from "@/components/ui/icon";

export function PWAInstallPrompt() {
  const [mounted, setMounted] = useState(false);
  const { canInstall, isInstalled, install, isInstalling } = usePWAInstall();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !canInstall || isInstalled) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-[20px] left-[20px] right-[20px] bg-ink-1 text-bg rounded-[16px] p-[16px] shadow-lg z-50"
        style={{ maxWidth: "calc(100% - 40px)" }}
      >
        <div className="flex gap-[12px]">
          <div className="w-[40px] h-[40px] rounded-[12px] bg-accent flex items-center justify-center flex-shrink-0">
            <Icon name="link" size={18} color="var(--bg)" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-[14px]">Instala Turno1Min</div>
            <div className="text-[12px] text-bg/80 mt-[2px]">
              Accede rápido desde tu pantalla de inicio
            </div>
          </div>
          <button
            onClick={install}
            disabled={isInstalling}
            className="flex-shrink-0 rounded-[8px] bg-accent hover:bg-accent/90 transition-colors px-[12px] py-[8px] text-[12px] font-medium text-bg disabled:opacity-50"
            style={{ fontFamily: "inherit" }}
          >
            {isInstalling ? "..." : "Instalar"}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
