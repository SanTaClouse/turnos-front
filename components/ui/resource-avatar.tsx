import { cn } from "@/lib/utils";

interface ResourceAvatarProps {
  initials: string;
  hue: number;
  size?: number;
  ring?: boolean;
  className?: string;
}

export function ResourceAvatar({ initials, hue, size = 36, ring = false, className }: ResourceAvatarProps) {
  return (
    <div
      className={cn("rounded-full flex items-center justify-center font-semibold flex-shrink-0", className)}
      style={{
        width: size,
        height: size,
        background: `oklch(0.88 0.05 ${hue})`,
        color: `oklch(0.32 0.08 ${hue})`,
        fontSize: size * 0.4,
        border: ring ? "2px solid white" : "none",
        boxShadow: ring ? "0 0 0 1px var(--line)" : "none",
      }}
    >
      {initials}
    </div>
  );
}
