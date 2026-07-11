"use client";

import { cn } from "@/lib/utils";
import { Avatar } from "@/components/shared/Avatar";

export interface AvatarPickerProps {
  selectedUrl: string | null;
  onSelect: (url: string) => void;
  className?: string;
}

/** Placeholder avatar options for profile setup */
const AVATAR_OPTIONS = [
  "/avatars/avatar-1.svg",
  "/avatars/avatar-2.svg",
  "/avatars/avatar-3.svg",
  "/avatars/avatar-4.svg",
  "/avatars/avatar-5.svg",
  "/avatars/avatar-6.svg",
];

/**
 * Avatar selection grid for profile setup.
 * TODO: Support custom image upload once file API is implemented.
 */
export function AvatarPicker({ selectedUrl, onSelect, className }: AvatarPickerProps) {
  return (
    <div className={cn("grid grid-cols-3 gap-3", className)}>
      {AVATAR_OPTIONS.map((url) => (
        <button
          key={url}
          type="button"
          onClick={() => onSelect(url)}
          className={cn(
            "rounded-full p-1 transition-all",
            selectedUrl === url
              ? "ring-2 ring-primary ring-offset-2"
              : "hover:ring-2 hover:ring-border"
          )}
          aria-label={`Select avatar ${url}`}
        >
          <Avatar src={url} name="Avatar" size="lg" />
        </button>
      ))}
    </div>
  );
}
