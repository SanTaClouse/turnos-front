import { cn } from "@/lib/utils";

interface BrandMarkProps {
  initials: string;
  brandColor?: string;
  size?: number;
  /** Si está presente, se muestra la imagen en vez de las iniciales. */
  imageUrl?: string | null;
  className?: string;
}

export function BrandMark({ initials, brandColor = "#0f0f0e", size = 48, imageUrl, className }: BrandMarkProps) {
  const radius = Math.round(size * 0.28);

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={initials}
        className={cn("flex-shrink-0 object-cover", className)}
        style={{ width: size, height: size, borderRadius: radius }}
      />
    );
  }

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
