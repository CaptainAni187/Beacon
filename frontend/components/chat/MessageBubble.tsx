"use client";

import { Check, CheckCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/uiStore";
import type { Message } from "@/types/message";

export interface MessageBubbleProps {
  message: Message;
  isOwn?: boolean;
}

/**
 * Individual message bubble with sender info, timestamp, and delivery ticks.
 */
export function MessageBubble({ message, isOwn = false }: MessageBubbleProps) {
  const chatColor = useUIStore((state) => state.appearance.chatColor);

  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-xs rounded-lg px-4 py-2 text-sm lg:max-w-md",
          isOwn ? "text-primary-foreground" : "bg-secondary text-secondary-foreground"
        )}
        style={isOwn ? { background: chatColor } : undefined}
      >
        {!isOwn && (
          <p className="mb-1 text-xs font-medium opacity-70">
            {message.sender.displayName}
          </p>
        )}
        <p>{message.content}</p>
        <p className={cn("mt-1 flex items-center justify-end gap-1 text-xs opacity-60")}>
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
          {isOwn && <StatusTick status={message.status} />}
        </p>
      </div>
    </div>
  );
}

function StatusTick({ status }: { status: Message["status"] }) {
  if (status === "sending") return <Clock className="h-3 w-3" aria-label="Sending" />;
  if (status === "read")
    return <CheckCheck className="h-3.5 w-3.5 text-sky-300" aria-label="Read" />;
  if (status === "delivered")
    return <CheckCheck className="h-3.5 w-3.5" aria-label="Delivered" />;
  return <Check className="h-3.5 w-3.5" aria-label="Sent" />;
}
