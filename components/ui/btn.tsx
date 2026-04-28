"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "accent" | "danger";
type Size = "lg" | "md" | "sm";

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<Variant, string> = {
  primary:   "bg-ink-1 text-bg border-transparent",
  secondary: "bg-surface text-ink-1 border-line border",
  ghost:     "bg-transparent text-ink-2 border-transparent",
  accent:    "bg-accent text-white border-transparent",
  danger:    "bg-danger text-white border-transparent",
};

const sizeStyles: Record<Size, { height: string; text: string; px: string }> = {
  lg: { height: "h-[54px]", text: "text-[16px]", px: "px-[22px]" },
  md: { height: "h-[44px]", text: "text-[15px]", px: "px-[18px]" },
  sm: { height: "h-[36px]", text: "text-[13px]", px: "px-[14px]" },
};

export function Btn({
  variant = "primary",
  size = "lg",
  full = true,
  loading = false,
  disabled,
  children,
  className,
  ...props
}: BtnProps) {
  const s = sizeStyles[size];
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "press-fx inline-flex items-center justify-center gap-2 rounded font-sans font-medium tracking-[-0.2px] transition-opacity",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        variantStyles[variant],
        s.height,
        s.text,
        s.px,
        full && "w-full",
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : children}
    </button>
  );
}
