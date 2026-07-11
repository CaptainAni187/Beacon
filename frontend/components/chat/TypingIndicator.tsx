"use client";

import { useTypingIndicator } from "@/hooks/useTypingIndicator";

export interface TypingIndicatorProps {
  conversationId: string;
}

/**
 * Displays who is currently typing in a conversation.
 */
export function TypingIndicator({ conversationId }: TypingIndicatorProps) {
  const { typingUsers, isAnyoneTyping } = useTypingIndicator(conversationId);

  if (!isAnyoneTyping) return null;

  const names = typingUsers.map((u) => u.username).join(", ");
  const label =
    typingUsers.length === 1 ? `${names} is typing…` : `${names} are typing…`;

  return (
    <div className="px-4 pb-1 text-xs text-muted-foreground italic">
      {label}
    </div>
  );
}
