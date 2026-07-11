"use client";

import { Users } from "lucide-react";
import { cn, formatRelativeTime, truncate } from "@/lib/utils";
import { Avatar } from "@/components/shared/Avatar";
import type { ConversationPreview } from "@/types/conversation";

export interface ConversationItemProps {
  conversation: ConversationPreview;
  isActive?: boolean;
  onClick?: () => void;
}

/**
 * Single conversation row in the sidebar list.
 */
export function ConversationItem({
  conversation,
  isActive = false,
  onClick,
}: ConversationItemProps) {
  const displayName = conversation.name ?? "Unknown";
  const preview = conversation.lastMessagePreview ?? "No messages yet";

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary",
        isActive && "bg-secondary"
      )}
    >
      <Avatar
        src={conversation.avatarUrl}
        name={displayName}
        size="md"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="flex min-w-0 items-center gap-1 truncate text-sm font-medium">
            {conversation.type === "group" && <Users className="h-3 w-3 flex-shrink-0" />}
            <span className="truncate">{displayName}</span>
          </span>
          {conversation.lastMessageAt && (
            <span className="ml-2 flex-shrink-0 text-xs text-muted-foreground">
              {formatRelativeTime(conversation.lastMessageAt)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className="truncate text-xs text-muted-foreground">
            {truncate(preview, 40)}
          </p>
          {conversation.unreadCount > 0 && (
            <span className="ml-2 flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary px-1 text-xs text-primary-foreground">
              {conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
