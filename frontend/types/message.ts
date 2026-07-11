/**
 * Message-related type definitions for the Beacon messaging platform.
 */

import type { User } from "./user";

export type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed";

export type MessageType = "text" | "image" | "file" | "system";

export interface MessageAttachment {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface MessageRecipientKey {
  wrappedKey: string;
  wrapIv: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender: User;
  /** Plaintext once decrypted client-side; ciphertext (base64) until then. */
  content: string;
  type: MessageType;
  attachments: MessageAttachment[];
  status: MessageStatus;
  replyToId: string | null;
  editedAt: string | null;
  createdAt: string;
  isEncrypted: boolean;
  iv: string | null;
  /** This user's own wrapped copy of the message's AES content key. */
  recipientKey: MessageRecipientKey | null;
}

export interface SendMessagePayload {
  conversationId: string;
  content: string;
  type?: MessageType;
  replyToId?: string;
  attachmentIds?: string[];
}

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  username: string;
  isTyping: boolean;
}

export interface MessagePage {
  messages: Message[];
  hasMore: boolean;
  nextCursor: string | null;
  page?: number;
  pageSize?: number;
  total?: number;
}
