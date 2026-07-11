"use client";

import { ArrowLeft, Info, Lock, Phone, Users, Video } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Avatar } from "@/components/shared/Avatar";
import { useConversationStore } from "@/store/conversationStore";
import { useUIStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import { usePresenceStore } from "@/store/presenceStore";
import { useCallStore } from "@/store/callStore";
import { formatRelativeTime } from "@/lib/utils";

export interface ChatHeaderProps {
  conversationId: string;
}

export function ChatHeader({ conversationId }: ChatHeaderProps) {
  const { setGroupInfoPanelOpen } = useUIStore();
  const { activeConversation, fetchConversation } = useConversationStore();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const presence = usePresenceStore((state) => state.presence);
  const { phase, startDirectCall } = useCallStore();

  useEffect(() => {
    if (activeConversation?.id !== conversationId) {
      void fetchConversation(conversationId);
    }
  }, [activeConversation?.id, conversationId, fetchConversation]);

  const name = activeConversation?.name ?? "Conversation";
  const otherParticipant =
    activeConversation?.type === "direct"
      ? activeConversation.participants.find((p) => p.id !== currentUserId)
      : undefined;
  const otherPresence = otherParticipant ? presence[otherParticipant.id] : undefined;
  const isOnline = otherPresence?.status === "online";

  const memberLine =
    activeConversation?.type === "group"
      ? `${activeConversation.memberCount} members`
      : isOnline
        ? "Online"
        : otherPresence?.lastSeenAt
          ? `Last seen ${formatRelativeTime(otherPresence.lastSeenAt)}`
          : "Offline";

  const startCall = (type: "voice" | "video") => {
    if (!activeConversation || phase !== "idle") return;
    const targets = activeConversation.members
      .filter((m) => m.userId !== currentUserId)
      .map((m) => ({ userId: m.userId, displayName: m.user.displayName, avatarUrl: m.user.avatarUrl }));
    void startDirectCall({ conversationId, type, targets });
  };

  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href="/"
          className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground md:hidden"
          aria-label="Back to conversations"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="relative flex-shrink-0">
          <Avatar src={activeConversation?.avatarUrl ?? null} name={name} size="md" />
          {activeConversation?.type === "direct" && isOnline && (
            <span
              className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-green-500"
              aria-label="Online"
            />
          )}
        </div>
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 truncate text-sm font-semibold">
            {name}
            <Lock className="h-3 w-3 text-muted-foreground" aria-label="End-to-end encrypted" />
          </h2>
          <p className="truncate text-xs text-muted-foreground">{memberLine}</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => startCall("voice")}
          className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Voice call"
        >
          <Phone className="h-4 w-4" />
        </button>
        <button
          onClick={() => startCall("video")}
          className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Video call"
        >
          <Video className="h-4 w-4" />
        </button>
        {activeConversation?.type === "group" && (
          <button
            onClick={() => setGroupInfoPanelOpen(true)}
            className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Conversation info"
          >
            <Info className="h-4 w-4" />
          </button>
        )}
        {activeConversation?.type === "direct" && (
          <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
        )}
      </div>
    </header>
  );
}
