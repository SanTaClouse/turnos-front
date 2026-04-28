import { cn } from "@/lib/utils";

interface BrandMarkProps {
  initials: string;
  brandColor?: string;
  size?: number;
  className?: string;
}

export function BrandMark({ initials, brandColor = "#0f0f0e", size = 48, className }: BrandMarkProps) {
  const radius = Math.round(size * 0.28);
  return (
    <div
      className={cn("flex items-center justify-center flex-shrink-0 font-serif italic text-white", className)}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: brandColor,
        fontSize: size * 0.5,
        letterSpacing: "-0.5px",
      }}
    >
      {initials}
    </div>
  );
}
