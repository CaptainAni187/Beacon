"use client";

import { useEffect } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { usePresenceStore } from "@/store/presenceStore";
import { useConversationStore } from "@/store/conversationStore";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { mapMessage, type ApiMessage } from "@/lib/conversations";
import { decryptIncoming } from "@/lib/encryption";

interface PresencePayload {
  user_id: string;
  last_seen_at?: string;
}

/**
 * App-wide WebSocket listener (mounted once in the main layout).
 * Keeps the presence store in sync and raises a toast for new messages
 * that arrive outside the conversation the user currently has open.
 */
export function RealtimeListener() {
  const { subscribe } = useWebSocket();
  const { setOnline, setOffline } = usePresenceStore();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const addToast = useUIStore((state) => state.addToast);

  useEffect(() => {
    const unsubOnline = subscribe("user.online", (data) => {
      const payload = data as PresencePayload;
      setOnline(payload.user_id);
    });
    const unsubOffline = subscribe("user.offline", (data) => {
      const payload = data as PresencePayload;
      setOffline(payload.user_id, payload.last_seen_at ?? null);
    });
    return () => {
      unsubOnline();
      unsubOffline();
    };
  }, [subscribe, setOnline, setOffline]);

  useEffect(() => {
    const unsubscribe = subscribe("message.new", (data) => {
      void (async () => {
        const message = await decryptIncoming(mapMessage(data as ApiMessage));
        if (message.senderId === currentUserId) return;

        const activeConversationId = useConversationStore.getState().activeConversationId;
        if (message.conversationId === activeConversationId) return;

        const { desktopNotifications, messagePreview } = useUIStore.getState().notifications;
        const body = messagePreview ? message.content : "New message";

        addToast({ message: `${message.sender.displayName}: ${body}`, variant: "info" });

        if (
          desktopNotifications &&
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          new Notification(message.sender.displayName, { body });
        }
      })();
    });
    return unsubscribe;
  }, [subscribe, currentUserId, addToast]);

  return null;
}
