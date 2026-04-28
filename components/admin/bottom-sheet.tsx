"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/icon";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-ink-1/40 z-[90]"
          />
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="fixed bottom-0 left-0 right-0 bg-bg rounded-[22px_22px_0_0] z-[100] flex flex-col"
            style={{ maxHeight: "85%", maxWidth: 430, margin: "0 auto" }}
          >
            {/* Drag handle */}
            <div className="pt-[10px] flex-shrink-0">
              <div className="w-[40px] h-[4px] rounded-[2px] bg-line mx-auto" />
            </div>

            {title && (
              <div className="flex items-center gap-[12px] px-[24px] pt-[14px] pb-[8px] flex-shrink-0">
                <span className="font-serif text-sheet-title flex-1">{title}</span>
                <button
                  onClick={onClose}
                  className="w-[32px] h-[32px] rounded-full bg-line-2 flex items-center justify-center"
                  aria-label="Cerrar"
                >
                  <Icon name="close" size={15} color="var(--ink-1)" />
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto hide-scroll px-[24px] pt-[8px] pb-[28px]">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
