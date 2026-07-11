/**
 * Conversation-related type definitions for the Beacon messaging platform.
 */

import type { User } from "./user";
import type { Message } from "./message";

export type ConversationType = "direct" | "group";

export interface Conversation {
  id: string;
  type: ConversationType;
  name: string | null;
  avatarUrl: string | null;
  participants: User[];
  members: ConversationMember[];
  lastMessage: Message | null;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  memberCount: number;
  isPinned: boolean;
  isMuted: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationPreview {
  id: string;
  type: ConversationType;
  name: string | null;
  avatarUrl: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  memberCount: number;
  isPinned: boolean;
  isMuted: boolean;
}

export interface ConversationMember {
  id: string;
  userId: string;
  role: "admin" | "member";
  user: User;
  joinedAt: string;
}

export interface CreateConversationPayload {
  participantIds: string[];
  type: ConversationType;
  name?: string;
}

export interface GroupConversation extends Conversation {
  type: "group";
  name: string;
  description: string | null;
  adminIds: string[];
  memberCount: number;
}
