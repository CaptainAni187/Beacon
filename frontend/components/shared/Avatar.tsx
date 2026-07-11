"use client";

import Image from "next/image";
import { cn, getAvatarColor, getInitials } from "@/lib/utils";

export type AvatarSize = "sm" | "md" | "lg" | "xl";

export interface AvatarProps {
  src: string | null;
  name: string;
  size?: AvatarSize;
  className?: string;
}

const sizeMap: Record<AvatarSize, { container: string; text: string; px: number }> = {
  sm: { container: "h-8 w-8", text: "text-xs", px: 32 },
  md: { container: "h-10 w-10", text: "text-sm", px: 40 },
  lg: { container: "h-14 w-14", text: "text-base", px: 56 },
  xl: { container: "h-20 w-20", text: "text-xl", px: 80 },
};

/**
 * User avatar with image fallback to initials.
 */
export function Avatar({ src, name, size = "md", className }: AvatarProps) {
  const { container, text, px } = sizeMap[size];
  const initials = getInitials(name);

  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={px}
        height={px}
        className={cn("rounded-full object-cover", container, className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-semibold text-white",
        container,
        text,
        className
      )}
      style={{ backgroundColor: getAvatarColor(name) }}
      aria-label={name}
    >
      {initials}
    </div>
  );
}
