"use client";

import { useState } from "react";
import { MoreVertical, ShieldCheck, ShieldOff, UserMinus } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";

/** Placeholder member data until API is implemented */
const PLACEHOLDER_MEMBERS: MemberListItem[] = [];

export interface MemberListItem {
  id: string;
  userId?: string;
  name: string;
  status: string;
  avatarUrl?: string | null;
}

export interface MemberListProps {
  members?: MemberListItem[];
  isCurrentUserAdmin?: boolean;
  currentUserId?: string;
  onPromote?: (userId: string) => void;
  onDemote?: (userId: string) => void;
  onRemove?: (userId: string) => void;
}

/**
 * List of group conversation members with online status and,
 * for admins, per-member promote/demote/remove actions.
 */
export function MemberList({
  members = PLACEHOLDER_MEMBERS,
  isCurrentUserAdmin = false,
  currentUserId,
  onPromote,
  onDemote,
  onRemove,
}: MemberListProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  if (members.length === 0) {
    return (
      <div className="flex-1 p-4 text-center text-sm text-muted-foreground">
        No members to display
      </div>
    );
  }

  return (
    <ul className="flex-1 overflow-y-auto p-2">
      {members.map((member) => {
        const canManage = isCurrentUserAdmin && member.userId && member.userId !== currentUserId;
        return (
          <li
            key={member.id}
            className="flex items-center justify-between gap-3 rounded-md px-3 py-2 hover:bg-secondary"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Avatar src={member.avatarUrl ?? null} name={member.name} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{member.name}</p>
                <p className="text-xs capitalize text-muted-foreground">{member.status}</p>
              </div>
            </div>

            {canManage && (
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                  className="rounded p-1 text-muted-foreground hover:text-foreground"
                  aria-label={`Manage ${member.name}`}
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {openMenuId === member.id && (
                  <div className="absolute right-0 top-8 z-10 w-40 rounded-md border border-border bg-background py-1 shadow-lg">
                    {member.status === "admin" ? (
                      <button
                        onClick={() => {
                          onDemote?.(member.userId!);
                          setOpenMenuId(null);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-secondary"
                      >
                        <ShieldOff className="h-3.5 w-3.5" /> Demote to member
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          onPromote?.(member.userId!);
                          setOpenMenuId(null);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-secondary"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" /> Make admin
                      </button>
                    )}
                    <button
                      onClick={() => {
                        onRemove?.(member.userId!);
                        setOpenMenuId(null);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-secondary"
                    >
                      <UserMinus className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
