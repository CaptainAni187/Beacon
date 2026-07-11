"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/shared/Avatar";
import { ModalShell } from "@/components/shared/ModalShell";
import { listContacts } from "@/lib/contacts";
import { useConversationStore } from "@/store/conversationStore";
import { useUIStore } from "@/store/uiStore";
import type { Contact } from "@/types/contact";
import { SearchBar } from "@/components/conversation-list/SearchBar";

export function CreateGroupModal() {
  const router = useRouter();
  const { isCreateGroupModalOpen, setCreateGroupModalOpen } = useUIStore();
  const { createGroupConversation } = useConversationStore();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isCreateGroupModalOpen) return;
    void listContacts().then(setContacts);
  }, [isCreateGroupModalOpen]);

  const filteredContacts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return contacts;
    return contacts.filter((contact) =>
      [contact.displayName, contact.username].some((value) =>
        value.toLowerCase().includes(normalized)
      )
    );
  }, [contacts, query]);

  const toggleSelected = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );
  };

  const submit = async () => {
    if (!name.trim() || selectedIds.length < 2) return;
    setIsSubmitting(true);
    try {
      const conversation = await createGroupConversation(name.trim(), selectedIds);
      setCreateGroupModalOpen(false);
      setName("");
      setQuery("");
      setSelectedIds([]);
      router.push(`/chat/${conversation.id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalShell
      isOpen={isCreateGroupModalOpen}
      onClose={() => setCreateGroupModalOpen(false)}
      title="Create Group"
    >
      <div className="space-y-4">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Group name"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <SearchBar value={query} onChange={setQuery} placeholder="Search contacts..." />
        <div className="max-h-72 overflow-y-auto">
          {filteredContacts.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Add contacts before creating a group.
            </p>
          ) : (
            filteredContacts.map((contact) => {
              const checked = selectedIds.includes(contact.userId);
              return (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => toggleSelected(contact.userId)}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-secondary"
                >
                  <input type="checkbox" checked={checked} readOnly className="h-4 w-4" />
                  <Avatar src={contact.avatarUrl} name={contact.displayName} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{contact.displayName}</p>
                    <p className="truncate text-xs text-muted-foreground">@{contact.username}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
        <button
          type="button"
          disabled={!name.trim() || selectedIds.length < 2 || isSubmitting}
          onClick={submit}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting ? "Creating..." : "Create Group"}
        </button>
      </div>
    </ModalShell>
  );
}
