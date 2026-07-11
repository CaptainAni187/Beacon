"use client";

import { UserPlus } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";

export interface Contact {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  status: string;
}

export interface ContactListProps {
  contacts?: Contact[];
  onSelect?: (contact: Contact) => void;
}

/**
 * Scrollable list of user contacts.
 * TODO: Fetch contacts from API and support search filtering.
 */
export function ContactList({ contacts = [], onSelect }: ContactListProps) {
  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <UserPlus className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No contacts yet</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {contacts.map((contact) => (
        <li key={contact.id}>
          <button
            onClick={() => onSelect?.(contact)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-secondary"
          >
            <Avatar src={contact.avatarUrl} name={contact.displayName} size="md" />
            <div>
              <p className="text-sm font-medium">{contact.displayName}</p>
              <p className="text-xs text-muted-foreground">@{contact.username}</p>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
