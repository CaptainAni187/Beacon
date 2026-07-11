"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Trash2, Link2, MoreHorizontal, Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, Video } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { CallLinkModal } from "@/components/calls/CallLinkModal";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import {
  clearCallHistory,
  createCallLink,
  getCallLink,
  listCalls,
  type CallLink,
  type CallRecord,
} from "@/lib/calls";
import { formatRelativeTime, cn } from "@/lib/utils";

export default function CallsPage() {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const addToast = useUIStore((state) => state.addToast);
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeLink, setActiveLink] = useState<CallLink | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setCalls(await listCalls());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCreateLink = async () => {
    try {
      const link = await createCallLink({ requiresAdminApproval: true });
      setActiveLink(link);
    } catch {
      addToast({ message: "Could not create call link", variant: "error" });
    }
  };

  const openCallEntry = async (call: CallRecord) => {
    if (!call.callLinkId) return;
    try {
      setActiveLink(await getCallLink(call.callLinkId));
    } catch {
      addToast({ message: "Could not load call link", variant: "error" });
    }
  };

  const handleClearHistory = async () => {
    setIsMenuOpen(false);
    try {
      await clearCallHistory();
      setCalls([]);
      addToast({ message: "Call history cleared", variant: "success" });
    } catch {
      addToast({ message: "Could not clear call history", variant: "error" });
    }
  };

  return (
    <div className="flex h-full">
      <div className="flex w-[360px] flex-shrink-0 flex-col border-r border-border bg-sidebar">
        <div className={cn("flex items-center justify-between px-4 py-3", !sidebarOpen && "md:pl-14")}>
          <h1 className="text-xl font-bold">Calls</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={handleCreateLink}
              className="rounded-md p-2 text-foreground/80 hover:bg-secondary"
              aria-label="New call link"
            >
              <Phone className="h-4 w-4" />
            </button>
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen((open) => !open)}
                className="rounded-md p-2 text-foreground/80 hover:bg-secondary"
                aria-label="More options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {isMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />
                  <div className="absolute right-0 top-9 z-20 w-56 rounded-lg border border-border bg-background py-1 shadow-xl">
                    <button
                      onClick={handleClearHistory}
                      disabled={calls.length === 0}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-secondary disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" /> Clear call history
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleCreateLink}
          className="flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
            <Link2 className="h-5 w-5" />
          </span>
          <span className="text-sm font-medium">Create a Call Link</span>
        </button>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {isLoading ? (
            <p className="p-4 text-center text-sm text-muted-foreground">Loading…</p>
          ) : calls.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">No recent calls</p>
          ) : (
            calls.map((call) => {
              const isMissed = call.status === "missed" || call.status === "declined";
              const wasOutgoing = call.initiator.id === currentUserId;
              const Icon = isMissed ? PhoneMissed : wasOutgoing ? PhoneOutgoing : PhoneIncoming;
              const title = call.callLinkId
                ? "Call link"
                : call.participants.find((p) => p.user.id !== currentUserId)?.user.displayName ??
                  call.initiator.displayName;

              return (
                <button
                  key={call.id}
                  onClick={() => void openCallEntry(call)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-secondary"
                >
                  <Avatar src={call.initiator.avatarUrl} name={title} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{title}</p>
                    <p
                      className={`flex items-center gap-1 truncate text-xs ${
                        isMissed ? "text-red-500" : "text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      {call.callLinkId ? "Call link" : call.type} ·{" "}
                      {formatRelativeTime(call.startedAt ?? call.createdAt)}
                    </p>
                  </div>
                  <Video className="h-4 w-4 text-muted-foreground" />
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <Phone className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Click + to start a new voice or video call.
        </p>
      </div>

      <CallLinkModal
        link={activeLink}
        onClose={() => setActiveLink(null)}
        onUpdated={(updated) => setActiveLink(updated)}
      />
    </div>
  );
}
