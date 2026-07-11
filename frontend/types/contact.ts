import type { UserStatus } from "./user";

export interface Contact {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  lastSeenAt: string | null;
  status: UserStatus;
  contactStatus: "pending" | "accepted" | "blocked";
}

export interface ContactSearchResult {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  phoneNumber: string | null;
  lastSeenAt: string | null;
  status: UserStatus;
}
