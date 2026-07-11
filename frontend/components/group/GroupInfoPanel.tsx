"use client";

import { useRouter } from "next/navigation";
import { LogOut, X } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { MemberList } from "./MemberList";
import { useUIStore } from "@/store/uiStore";
import { useConversationStore } from "@/store/conversationStore";
import { useAuthStore } from "@/store/authStore";
import { leaveGroup, updateMemberRole, removeMember } from "@/lib/conversations";
import { cn } from "@/lib/utils";

export interface GroupInfoPanelProps {
  groupName?: string;
  memberCount?: number;
  className?: string;
}

/**
 * Slide-over panel displaying group conversation details, members, and
 * admin-only member management (promote/demote/remove) plus leave-group.
 */
export function GroupInfoPanel({
  groupName = "Group",
  memberCount = 0,
  className,
}: GroupInfoPanelProps) {
  const router = useRouter();
  const { isGroupInfoPanelOpen, setGroupInfoPanelOpen, addToast } = useUIStore();
  const { activeConversation, fetchConversation, fetchConversations, removeConversation } =
    useConversationStore();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const name = activeConversation?.name ?? groupName;
  const count = activeConversation?.memberCount ?? memberCount;

  if (!isGroupInfoPanelOpen || !activeConversation) return null;

  const currentMembership = activeConversation.members.find(
    (member) => member.userId === currentUserId
  );
  const isCurrentUserAdmin = currentMembership?.role === "admin";

  const refresh = () => void fetchConversation(activeConversation.id);

  const handlePromote = async (userId: string) => {
    try {
      await updateMemberRole(activeConversation.id, userId, "admin");
      refresh();
    } catch (error) {
      addToast({ message: "Could not promote member", variant: "error" });
    }
  };

  const handleDemote = async (userId: string) => {
    try {
      await updateMemberRole(activeConversation.id, userId, "member");
      refresh();
    } catch (error) {
      addToast({
        message: error instanceof Error ? error.message : "Could not demote member",
        variant: "error",
      });
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await removeMember(activeConversation.id, userId);
      refresh();
    } catch (error) {
      addToast({ message: "Could not remove member", variant: "error" });
    }
  };

  const handleLeave = async () => {
    try {
      await leaveGroup(activeConversation.id);
      removeConversation(activeConversation.id);
      setGroupInfoPanelOpen(false);
      await fetchConversations();
      router.push("/");
    } catch (error) {
      addToast({ message: "Could not leave group", variant: "error" });
    }
  };

  return (
    <aside
      className={cn(
        "absolute right-0 top-0 z-10 flex h-full w-72 flex-col border-l border-border bg-background shadow-lg",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="font-semibold">Group Info</h3>
        <button
          onClick={() => setGroupInfoPanelOpen(false)}
          className="rounded p-1 text-muted-foreground hover:text-foreground"
          aria-label="Close panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col items-center border-b border-border p-6">
        <Avatar src={activeConversation.avatarUrl ?? null} name={name} size="xl" />
        <h4 className="mt-3 font-semibold">{name}</h4>
        <p className="text-sm text-muted-foreground">{count} members</p>
      </div>

      <MemberList
        members={activeConversation.members.map((member) => ({
          id: member.id,
          userId: member.userId,
          name: member.user.displayName,
          status: member.role,
          avatarUrl: member.user.avatarUrl,
        }))}
        isCurrentUserAdmin={isCurrentUserAdmin}
        currentUserId={currentUserId}
        onPromote={handlePromote}
        onDemote={handleDemote}
        onRemove={handleRemove}
      />

      <div className="border-t border-border p-3">
        <button
          onClick={handleLeave}
          className="flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-secondary"
        >
          <LogOut className="h-4 w-4" /> Leave group
        </button>
      </div>
    </aside>
  );
}
