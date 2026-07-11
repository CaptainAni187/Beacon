"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TypingIndicator } from "@/types/message";
import { useUIStore } from "@/store/uiStore";
import { useWebSocket } from "./useWebSocket";

const AUTO_CLEAR_MS = 3000;

/**
 * Typing indicator hook for a specific conversation.
 * Sends and receives typing events via WebSocket; auto-clears a remote
 * user's typing state if no follow-up event arrives within ~3s (covers a
 * dropped typing.stop event).
 */
export function useTypingIndicator(conversationId: string) {
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const typingIndicatorsEnabled = useUIStore((state) => state.privacy.typingIndicatorsEnabled);
  const { send, subscribe } = useWebSocket();
  const clearTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const unsubscribe = subscribe("typing.start", (data) => {
      const indicator = data as TypingIndicator;
      if (indicator.conversationId !== conversationId) return;

      setTypingUsers((prev) => {
        const exists = prev.some((u) => u.userId === indicator.userId);
        return exists ? prev : [...prev, { ...indicator, isTyping: true }];
      });

      const existingTimer = clearTimers.current.get(indicator.userId);
      if (existingTimer) clearTimeout(existingTimer);
      clearTimers.current.set(
        indicator.userId,
        setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u.userId !== indicator.userId));
          clearTimers.current.delete(indicator.userId);
        }, AUTO_CLEAR_MS)
      );
    });
    return unsubscribe;
  }, [conversationId, subscribe]);

  useEffect(() => {
    const unsubscribe = subscribe("typing.stop", (data) => {
      const indicator = data as TypingIndicator;
      if (indicator.conversationId !== conversationId) return;

      const existingTimer = clearTimers.current.get(indicator.userId);
      if (existingTimer) clearTimeout(existingTimer);
      clearTimers.current.delete(indicator.userId);

      setTypingUsers((prev) => prev.filter((u) => u.userId !== indicator.userId));
    });
    return unsubscribe;
  }, [conversationId, subscribe]);

  useEffect(() => {
    const timers = clearTimers.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      // Suppressed when the user turns off typing indicators in Privacy settings —
      // matches the read-receipts toggle: off means neither seeing nor sharing it.
      if (!typingIndicatorsEnabled) return;
      send(isTyping ? "typing.start" : "typing.stop", { conversationId, isTyping });
    },
    [conversationId, send, typingIndicatorsEnabled]
  );

  return {
    typingUsers,
    sendTyping,
    isAnyoneTyping: typingUsers.length > 0,
  };
}
