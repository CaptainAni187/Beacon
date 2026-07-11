"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { listConversations } from "@/lib/conversations";
import type { ConversationPreview } from "@/types/conversation";
import { cn } from "@/lib/utils";

interface ChatPickerProps {
  label: string;
  conversations: ConversationPreview[];
  selected: string[];
  onToggle: (id: string) => void;
}

function ChatPicker({ label, conversations, selected, onToggle }: ChatPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center gap-3 py-2.5 text-left text-sm hover:bg-secondary"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
          <Plus className="h-4 w-4" />
        </span>
        {label}
      </button>
      {isOpen && (
        <div className="ml-12 max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-2">
          {conversations.map((c) => (
            <label key={c.id} className="flex items-center gap-2 py-1 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(c.id)}
                onChange={() => onToggle(c.id)}
              />
              {c.name ?? "Conversation"}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CreateChatFolderPage() {
  const router = useRouter();
  const { addChatFolder } = useUIStore();
  const [name, setName] = useState("");
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [included, setIncluded] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [includeMuted, setIncludeMuted] = useState(true);

  useEffect(() => {
    void listConversations().then(setConversations);
  }, []);

  const toggle = (list: string[], setList: (ids: string[]) => void, id: string) => {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    addChatFolder({
      name: name.trim(),
      includedChatIds: included,
      excludedChatIds: excluded,
      onlyUnread,
      includeMuted,
    });
    router.push("/settings/chats/folders");
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
      <h2 className="mb-8 text-center text-lg font-semibold">Create a folder</h2>

      <label className="mb-1 block text-sm font-semibold text-muted-foreground">Folder name</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Folder name (required)"
        className="mb-6 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />

      <div className="my-2 border-t border-border" />
      <h3 className="mb-1 mt-4 text-sm font-semibold text-muted-foreground">Included chats</h3>
      <ChatPicker
        label="Add chats"
        conversations={conversations}
        selected={included}
        onToggle={(id) => toggle(included, setIncluded, id)}
      />
      <p className="text-xs text-muted-foreground">Choose chats that you want to appear in this folder</p>

      <div className="my-4 border-t border-border" />
      <h3 className="mb-1 text-sm font-semibold text-muted-foreground">Exceptions</h3>
      <ChatPicker
        label="Exclude chats"
        conversations={conversations}
        selected={excluded}
        onToggle={(id) => toggle(excluded, setExcluded, id)}
      />
      <p className="text-xs text-muted-foreground">Choose chats that you do not want to appear in this folder</p>

      <div className="my-4 border-t border-border" />

      <div className="flex items-center justify-between py-2">
        <div>
          <p className="text-sm">Only show unread chats</p>
          <p className="text-xs text-muted-foreground">
            Only chats with unread messages will be shown in this folder.
          </p>
        </div>
        <button
          role="switch"
          aria-checked={onlyUnread}
          onClick={() => setOnlyUnread((v) => !v)}
          className={cn(
            "relative h-6 w-11 flex-shrink-0 rounded-full transition-colors",
            onlyUnread ? "bg-primary" : "bg-secondary"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full bg-background transition-transform",
              onlyUnread ? "translate-x-5" : "translate-x-0.5"
            )}
          />
        </button>
      </div>

      <div className="flex items-center justify-between py-2">
        <p className="text-sm">Include muted chats</p>
        <button
          role="switch"
          aria-checked={includeMuted}
          onClick={() => setIncludeMuted((v) => !v)}
          className={cn(
            "relative h-6 w-11 flex-shrink-0 rounded-full transition-colors",
            includeMuted ? "bg-primary" : "bg-secondary"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full bg-background transition-transform",
              includeMuted ? "translate-x-5" : "translate-x-0.5"
            )}
          />
        </button>
      </div>

      <div className="mt-8 flex justify-end gap-2">
        <button
          onClick={() => router.back()}
          className="rounded-full bg-secondary px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  );
}
