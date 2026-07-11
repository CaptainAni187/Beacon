"use client";

import { useEffect, useState } from "react";
import { SearchBar } from "@/components/conversation-list/SearchBar";
import { Avatar } from "@/components/shared/Avatar";
import { ModalShell } from "@/components/shared/ModalShell";
import { addContact, searchUsers } from "@/lib/contacts";
import type { ContactSearchResult } from "@/types/contact";

export interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd?: (username: string) => void;
}

export function AddContactModal({ isOpen, onClose, onAdd }: AddContactModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ContactSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !query.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const users = await searchUsers(query);
        if (!cancelled) setResults(users);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [isOpen, query]);

  const handleAdd = async (username: string) => {
    await addContact(username);
    onAdd?.(username);
    setQuery("");
    onClose();
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Add Contact">
      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder="Search by username, name, or phone..."
      />
      <div className="mt-4 max-h-72 overflow-y-auto">
        {isLoading ? (
          <p className="p-4 text-center text-sm text-muted-foreground">Searching...</p>
        ) : results.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            Matching users will appear here.
          </p>
        ) : (
          results.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => handleAdd(user.username)}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-secondary"
            >
              <Avatar src={user.avatarUrl} name={user.displayName} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.displayName}</p>
                <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
              </div>
            </button>
          ))
        )}
      </div>
    </ModalShell>
  );
}
