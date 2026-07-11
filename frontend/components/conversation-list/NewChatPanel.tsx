"use client";

import { ArrowLeft, AtSign, Hash, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/shared/Avatar";
import { listContacts, searchUsers } from "@/lib/contacts";
import { useConversationStore } from "@/store/conversationStore";
import { useUIStore } from "@/store/uiStore";
import type { Contact, ContactSearchResult } from "@/types/contact";

export interface NewChatPanelProps {
  onClose: () => void;
}

type ContactLike = Contact | ContactSearchResult;

function contactId(contact: ContactLike): string {
  return "userId" in contact ? contact.userId : contact.id;
}

/**
 * Signal-style "New chat" panel: replaces the conversation list in place
 * (rather than a floating modal) with quick actions and a searchable
 * contact list.
 */
export function NewChatPanel({ onClose }: NewChatPanelProps) {
  const router = useRouter();
  const { createDirectConversation } = useConversationStore();
  const { setCreateGroupModalOpen } = useUIStore();
  const [query, setQuery] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchResults, setSearchResults] = useState<ContactSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    void listContacts().then(setContacts);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    setIsSearching(true);
    const timeout = window.setTimeout(async () => {
      try {
        const results = await searchUsers(trimmed);
        if (!cancelled) setSearchResults(results);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [query]);

  const visibleContacts = useMemo<ContactLike[]>(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return contacts;

    const filteredContacts = contacts.filter((contact) =>
      [contact.displayName, contact.username].some((v) => v.toLowerCase().includes(normalized))
    );
    const knownIds = new Set(filteredContacts.map((c) => c.userId));
    const extra = searchResults.filter((result) => !knownIds.has(result.id));
    return [...filteredContacts, ...extra];
  }, [contacts, searchResults, query]);

  const startChat = async (userId: string) => {
    const conversation = await createDirectConversation(userId);
    onClose();
    setQuery("");
    router.push(`/chat/${conversation.id}`);
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-3 py-3">
        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-foreground hover:bg-secondary"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-base font-semibold">New chat</h2>
      </div>

      <div className="border-b border-border p-3">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name, username, or number"
          className="w-full rounded-full bg-secondary px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <button
          onClick={() => {
            onClose();
            setCreateGroupModalOpen(true);
          }}
          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-secondary"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
            <Users className="h-5 w-5" />
          </span>
          <span className="text-sm font-medium">New group</span>
        </button>

        <button className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-secondary">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
            <AtSign className="h-5 w-5" />
          </span>
          <span className="text-sm font-medium">Find by username</span>
        </button>

        <button className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-secondary">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
            <Hash className="h-5 w-5" />
          </span>
          <span className="text-sm font-medium">Find by phone number</span>
        </button>

        <p className="px-4 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Contacts
        </p>

        {isSearching && visibleContacts.length === 0 && (
          <p className="px-4 py-3 text-sm text-muted-foreground">Searching…</p>
        )}

        {!isSearching && visibleContacts.length === 0 && (
          <p className="px-4 py-3 text-sm text-muted-foreground">No contacts found.</p>
        )}

        {visibleContacts.map((contact) => (
          <button
            key={contactId(contact)}
            onClick={() => startChat(contactId(contact))}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-secondary"
          >
            <Avatar src={contact.avatarUrl} name={contact.displayName} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{contact.displayName}</p>
              <p className="truncate text-xs text-muted-foreground">@{contact.username}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
