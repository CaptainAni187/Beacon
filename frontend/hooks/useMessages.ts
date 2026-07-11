"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getConversationMessages, mapMessage, type ApiMessage } from "@/lib/conversations";
import { decryptIncoming, tryEncryptForMembers } from "@/lib/encryption";
import { useAuthStore } from "@/store/authStore";
import { useConversationStore } from "@/store/conversationStore";
import { useUIStore } from "@/store/uiStore";
import { useWebSocket } from "./useWebSocket";
import type { Message, MessageStatus, SendMessagePayload } from "@/types/message";

interface StatusEventPayload {
  message_id: string;
  conversation_id: string;
  user_id: string;
  status: MessageStatus;
}

function rankStatus(status: MessageStatus): number {
  return { sending: -1, sent: 0, delivered: 1, read: 2, failed: -2 }[status] ?? 0;
}

export function useMessages(conversationId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentUserId = useAuthStore((state) => state.user?.id);
  const readReceiptsEnabled = useUIStore((state) => state.privacy.readReceiptsEnabled);
  const { send, subscribe } = useWebSocket();
  const acknowledged = useRef<Set<string>>(new Set());

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    setIsLoading(true);
    setError(null);
    try {
      const page = await getConversationMessages(conversationId);
      const decrypted = await Promise.all(page.messages.map(decryptIncoming));
      setMessages(decrypted);
      setHasMore(page.hasMore);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not load messages");
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  // Merge live "message.new" events into the REST-loaded history, deduped by id.
  useEffect(() => {
    const unsubscribe = subscribe("message.new", (data) => {
      void (async () => {
        const message = await decryptIncoming(mapMessage(data as ApiMessage));
        if (message.conversationId !== conversationId) return;

        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });

        if (message.senderId !== currentUserId && !acknowledged.current.has(message.id)) {
          acknowledged.current.add(message.id);
          send("message.delivered", { message_id: message.id });
        }
      })();
    });
    return unsubscribe;
  }, [conversationId, currentUserId, send, subscribe]);

  // Update ticks on the sender's own messages as delivered/read acks arrive.
  useEffect(() => {
    const applyStatus = (status: MessageStatus) => (data: unknown) => {
      const event = data as StatusEventPayload;
      if (event.conversation_id !== conversationId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === event.message_id && rankStatus(status) > rankStatus(m.status)
            ? { ...m, status }
            : m
        )
      );
    };
    const unsubDelivered = subscribe("message.delivered", applyStatus("delivered"));
    const unsubRead = subscribe("message.read", applyStatus("read"));
    return () => {
      unsubDelivered();
      unsubRead();
    };
  }, [conversationId, subscribe]);

  // Mark incoming messages as read once they're visible in the open conversation.
  // Skipped entirely when the user has disabled read receipts in Privacy settings —
  // their messages stay at "delivered" from the sender's point of view.
  useEffect(() => {
    if (!conversationId || messages.length === 0 || !readReceiptsEnabled) return;
    for (const message of messages) {
      if (message.senderId !== currentUserId && message.status !== "read") {
        send("message.read", { message_id: message.id });
      }
    }
  }, [conversationId, currentUserId, messages, send, readReceiptsEnabled]);

  const sendMessage = useCallback(
    async (payload: SendMessagePayload) => {
      const activeConversation = useConversationStore.getState().activeConversation;
      const members = activeConversation?.members ?? [];

      const encrypted = await tryEncryptForMembers(members, payload.content);

      if (encrypted) {
        send("message.new", {
          conversation_id: payload.conversationId,
          content: encrypted.content,
          type: payload.type ?? "text",
          reply_to_id: payload.replyToId,
          is_encrypted: true,
          iv: encrypted.iv,
          recipient_keys: encrypted.recipientKeys.map((key) => ({
            user_id: key.userId,
            wrapped_key: key.wrappedKey,
            wrap_iv: key.wrapIv,
          })),
        });
      } else {
        // Fallback for conversations where not every member has an E2EE key yet
        // (e.g. seeded demo accounts that have never signed in from a browser).
        send("message.new", {
          conversation_id: payload.conversationId,
          content: payload.content,
          type: payload.type ?? "text",
          reply_to_id: payload.replyToId,
        });
      }
    },
    [send]
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    // TODO: Fetch next page using cursor pagination
  }, [hasMore, isLoading]);

  return {
    messages,
    isLoading,
    hasMore,
    error,
    fetchMessages,
    sendMessage,
    loadMore,
  };
}
