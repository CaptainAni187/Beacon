"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/authStore";
import { MessageBubble } from "./MessageBubble";
import type { Message } from "@/types/message";

export interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

/**
 * Scrollable message list for a conversation.
 * TODO: Implement infinite scroll pagination.
 */
export function MessageList({ messages, isLoading }: MessageListProps) {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading messages…
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        No messages yet. Say hello!
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4 scrollbar-thin">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          isOwn={message.senderId === currentUserId}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
