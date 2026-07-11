import { apiGet, apiPost } from "@/lib/api";
import type { Contact, ContactSearchResult } from "@/types/contact";

type ApiContact = {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  last_seen_at: string | null;
  status: Contact["status"];
  contact_status: Contact["contactStatus"];
};

type ApiSearchResult = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  phone_number: string | null;
  last_seen_at: string | null;
  status: ContactSearchResult["status"];
};

function mapContact(contact: ApiContact): Contact {
  return {
    id: contact.id,
    userId: contact.user_id,
    username: contact.username,
    displayName: contact.display_name,
    avatarUrl: contact.avatar_url,
    lastSeenAt: contact.last_seen_at,
    status: contact.status,
    contactStatus: contact.contact_status,
  };
}

function mapSearchResult(user: ApiSearchResult): ContactSearchResult {
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    phoneNumber: user.phone_number,
    lastSeenAt: user.last_seen_at,
    status: user.status,
  };
}

export async function listContacts(): Promise<Contact[]> {
  return (await apiGet<ApiContact[]>("/api/contacts/")).map(mapContact);
}

export async function searchUsers(query: string): Promise<ContactSearchResult[]> {
  if (!query.trim()) return [];
  const params = new URLSearchParams({ q: query.trim() });
  return (await apiGet<ApiSearchResult[]>(`/api/contacts/search?${params}`)).map(mapSearchResult);
}

export async function addContact(username: string): Promise<Contact> {
  return mapContact(await apiPost<ApiContact>("/api/contacts/", { username }));
}
