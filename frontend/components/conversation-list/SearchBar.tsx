"use client";

import { ListFilter, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchBarProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  filterActive?: boolean;
  onToggleFilter?: () => void;
}

/**
 * Search input for filtering conversations and contacts, with an optional
 * trailing "filter by unread" toggle button (Signal-style).
 */
export function SearchBar({
  value = "",
  onChange,
  placeholder = "Search",
  className,
  filterActive,
  onToggleFilter,
}: SearchBarProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={filterActive ? "Search unread chats" : placeholder}
          className={cn(
            "w-full rounded-full border-0 bg-secondary py-2 pl-9 pr-3 text-sm",
            "focus:outline-none focus:ring-2 focus:ring-ring"
          )}
        />
      </div>
      {onToggleFilter && (
        <button
          onClick={onToggleFilter}
          aria-label="Filter by unread"
          title="Filter by unread"
          className={cn(
            "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-colors",
            filterActive
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          )}
        >
          <ListFilter className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
