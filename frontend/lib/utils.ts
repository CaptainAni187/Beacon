import { clsx, type ClassValue } from "clsx";

/**
 * Merge class names with clsx. Used throughout the UI layer for conditional styling.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/**
 * Format a date string into a human-readable relative time label.
 * TODO: Implement with Intl.RelativeTimeFormat for i18n support.
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
  return date.toLocaleDateString();
}

/**
 * Truncate a string to a maximum length with ellipsis.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength)}…`;
}

/**
 * Generate initials from a display name for avatar fallbacks.
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** Signal-style avatar background palette, picked deterministically per name. */
const AVATAR_PALETTE = [
  "#3a76f0", // blue
  "#4bb543", // green
  "#e07b39", // orange
  "#a259d9", // purple
  "#d94f70", // pink/red
  "#2bb3a3", // teal
  "#c9a227", // gold
  "#6c7ae0", // indigo
];

/**
 * Deterministically pick a background color for a name-based avatar fallback,
 * so the same contact always renders with the same color (mirrors Signal).
 */
export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

/**
 * Debounce a function call by the specified delay in milliseconds.
 */
export function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Sleep for a given number of milliseconds. Useful for retry logic.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check whether code is running in a browser environment.
 */
export function isBrowser(): boolean {
  return typeof window !== "undefined";
}
