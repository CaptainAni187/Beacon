"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, Folder, MessageCircleReply, Plus, Users } from "lucide-react";
import { useUIStore } from "@/store/uiStore";

const SUGGESTED_FOLDERS = [
  {
    key: "unread" as const,
    label: "Unread",
    description: "Unread messages from all chats",
    icon: MessageCircleReply,
  },
  {
    key: "direct" as const,
    label: "1:1 chats",
    description: "Only messages from direct chats",
    icon: Users,
  },
  {
    key: "groups" as const,
    label: "Groups",
    description: "Only messages from group chats",
    icon: Users,
  },
];

export default function ChatFoldersPage() {
  const router = useRouter();
  const { chatFolders, addChatFolder, addToast } = useUIStore();

  const addSuggested = (key: "unread" | "direct" | "groups", label: string) => {
    addChatFolder({
      name: label,
      includedChatIds: [],
      excludedChatIds: [],
      onlyUnread: key === "unread",
      includeMuted: true,
    });
    addToast({ message: `${label} folder added`, variant: "success" });
  };

  return (
    <div className="relative mx-auto max-w-xl py-8">
      <button
        onClick={() => router.back()}
        className="absolute left-0 top-8 rounded-md p-1.5 text-muted-foreground hover:text-foreground"
        aria-label="Back"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <h2 className="mb-2 text-center text-lg font-semibold">Chat folders</h2>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Organize your chats into folders and quickly switch between them on your chat list
      </p>

      <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Folders</h3>
      <button
        onClick={() => router.push("/settings/chats/folders/new")}
        className="flex w-full items-center gap-3 py-2.5 text-left text-sm hover:bg-secondary"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
          <Plus className="h-4 w-4" />
        </span>
        Create a folder
      </button>
      <div className="flex items-center gap-3 py-2.5 text-sm text-muted-foreground">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
          <Folder className="h-4 w-4" />
        </span>
        All chats
      </div>

      {chatFolders.length > 0 && (
        <>
          <div className="my-4 border-t border-border" />
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Your folders</h3>
          {chatFolders.map((folder) => (
            <div key={folder.id} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
                <Folder className="h-4 w-4" />
              </span>
              {folder.name}
            </div>
          ))}
        </>
      )}

      <div className="my-4 border-t border-border" />

      <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Suggested folders</h3>
      {SUGGESTED_FOLDERS.map(({ key, label, description, icon: Icon }) => (
        <div key={key} className="flex items-center justify-between gap-3 py-2.5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
              <Icon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          <button
            onClick={() => addSuggested(key, label)}
            className="flex-shrink-0 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium hover:bg-accent"
          >
            Add
          </button>
        </div>
      ))}
    </div>
  );
}
