"use client";

import { useState } from "react";
import { Copy, Pencil, Share2, UserCheck, Video } from "lucide-react";
import { ModalShell } from "@/components/shared/ModalShell";
import { useAuthStore } from "@/store/authStore";
import { useCallStore } from "@/store/callStore";
import { useUIStore } from "@/store/uiStore";
import { updateCallLink, type CallLink } from "@/lib/calls";

export interface CallLinkModalProps {
  link: CallLink | null;
  onClose: () => void;
  onUpdated?: (link: CallLink) => void;
}

const JOIN_BASE_URL =
  (typeof window !== "undefined" && window.location.origin) || "http://localhost:3000";

export function CallLinkModal({ link, onClose, onUpdated }: CallLinkModalProps) {
  const addToast = useUIStore((state) => state.addToast);
  const currentUserId = useAuthStore((state) => state.user?.id);
  const joinRoom = useCallStore((state) => state.joinRoom);
  const [name, setName] = useState(link?.name ?? "");
  const [requiresApproval, setRequiresApproval] = useState(link?.requiresAdminApproval ?? true);
  const [isSaving, setIsSaving] = useState(false);

  if (!link) return null;

  const joinUrl = `${JOIN_BASE_URL}/call/${link.roomKey}`;
  const isCreator = link.createdBy.id === currentUserId;

  const handleJoin = () => {
    void joinRoom({ roomKey: link.roomKey, type: "video", title: link.name || "Call" });
    onClose();
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(joinUrl);
    addToast({ message: "Link copied", variant: "success" });
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: link.name ?? "Beacon call", url: joinUrl }).catch(() => undefined);
    } else {
      await handleCopy();
    }
  };

  const saveSettings = async (updates: { name?: string; requiresAdminApproval?: boolean }) => {
    setIsSaving(true);
    try {
      const updated = await updateCallLink(link.id, updates);
      onUpdated?.(updated);
    } catch {
      addToast({ message: "Could not update call link", variant: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalShell isOpen onClose={onClose} title="Call link details">
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg border border-border p-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Video className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{link.name || "Beacon Call"}</p>
            <p className="truncate text-xs text-muted-foreground">{joinUrl}</p>
          </div>
          <button
            onClick={handleJoin}
            className="rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-primary hover:bg-accent"
          >
            Join
          </button>
        </div>

        {isCreator && (
          <div className="divide-y divide-border rounded-lg border border-border">
            <div className="flex items-center gap-3 p-3">
              <Pencil className="h-4 w-4 text-muted-foreground" />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => name !== link.name && void saveSettings({ name })}
                placeholder="Add call name"
                className="flex-1 bg-transparent text-sm focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-between gap-3 p-3">
              <span className="flex items-center gap-3 text-sm">
                <UserCheck className="h-4 w-4 text-muted-foreground" />
                Require admin approval
              </span>
              <select
                value={requiresApproval ? "on" : "off"}
                disabled={isSaving}
                onChange={(e) => {
                  const value = e.target.value === "on";
                  setRequiresApproval(value);
                  void saveSettings({ requiresAdminApproval: value });
                }}
                className="rounded-md border border-border bg-background px-2 py-1 text-sm"
              >
                <option value="on">On</option>
                <option value="off">Off</option>
              </select>
            </div>
          </div>
        )}

        <div className="divide-y divide-border rounded-lg border border-border">
          <button
            onClick={handleCopy}
            className="flex w-full items-center gap-3 p-3 text-left text-sm hover:bg-secondary"
          >
            <Copy className="h-4 w-4 text-muted-foreground" /> Copy link
          </button>
          <button
            onClick={handleShare}
            className="flex w-full items-center gap-3 p-3 text-left text-sm hover:bg-secondary"
          >
            <Share2 className="h-4 w-4 text-muted-foreground" /> Share link via Beacon
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
