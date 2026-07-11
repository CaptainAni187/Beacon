import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { decryptPreview } from "@/lib/encryption";
import type { Conversation, ConversationMember, ConversationPreview } from "@/types/conversation";
import type { Message, MessageAttachment, MessagePage } from "@/types/message";
import type { User } from "@/types/user";

type ApiUser = Omit<User, "displayName" | "avatarUrl" | "createdAt" | "updatedAt" | "publicKey"> & {
  display_name: string;
  avatar_url: string | null;
  public_key?: string | null;
  created_at?: string;
  updated_at?: string;
};

type ApiLastMessage = {
  id: string;
  content: string;
  type: Message["type"];
  sender_id: string;
  sender_display_name: string;
  sender_public_key?: string | null;
  created_at: string;
  is_encrypted?: boolean;
  iv?: string | null;
  recipient_key?: { wrapped_key: string; wrap_iv: string } | null;
};

type ApiConversationSummary = {
  id: string;
  type: Conversation["type"];
  name: string | null;
  avatar_url: string | null;
  last_message: ApiLastMessage | null;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
  member_count: number;
  is_pinned: boolean;
  is_muted: boolean;
};

type ApiMember = {
  id: string;
  user_id: string;
  role: "admin" | "member";
  joined_at: string;
  user: ApiUser;
};

type ApiConversation = ApiConversationSummary & {
  description: string | null;
  created_by_id: string;
  members: ApiMember[];
  created_at: string;
  updated_at: string;
};

type ApiAttachment = {
  id: string;
  url: string;
  filename: string;
  mime_type: string;
  size: number;
};

export type ApiMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender: ApiUser;
  content: string;
  type: Message["type"];
  attachments: ApiAttachment[];
  statuses: Array<{ status: Message["status"] }>;
  reply_to_id: string | null;
  created_at: string;
  is_encrypted?: boolean;
  iv?: string | null;
  recipient_key?: { wrapped_key: string; wrap_iv: string } | null;
};

type ApiMessageHistory = {
  messages: ApiMessage[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    has_next: boolean;
  };
};

export function mapUser(user: ApiUser): User {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    status: user.status,
    bio: user.bio,
    publicKey: user.public_key ?? null,
    createdAt: user.created_at ?? "",
    updatedAt: user.updated_at ?? "",
  };
}

function mapAttachment(attachment: ApiAttachment): MessageAttachment {
  return {
    id: attachment.id,
    url: attachment.url,
    filename: attachment.filename,
    mimeType: attachment.mime_type,
    size: attachment.size,
  };
}

export function mapMessage(message: ApiMessage): Message {
  return {
    id: message.id,
    conversationId: message.conversation_id,
    senderId: message.sender_id,
    sender: mapUser(message.sender),
    content: message.content,
    type: message.type,
    attachments: message.attachments.map(mapAttachment),
    status: message.statuses[0]?.status ?? "sent",
    replyToId: message.reply_to_id,
    editedAt: null,
    createdAt: message.created_at,
    isEncrypted: message.is_encrypted ?? false,
    iv: message.iv ?? null,
    recipientKey: message.recipient_key
      ? { wrappedKey: message.recipient_key.wrapped_key, wrapIv: message.recipient_key.wrap_iv }
      : null,
  };
}

/**
 * Resolve the sidebar preview text for a conversation's last message,
 * decrypting client-side when the message is encrypted (the server only
 * ever stores ciphertext, so it can't build this preview itself).
 */
async function resolvePreviewText(conversation: ApiConversationSummary): Promise<string | null> {
  const lastMessage = conversation.last_message;
  if (!lastMessage) return conversation.last_message_preview;
  if (!lastMessage.is_encrypted) return conversation.last_message_preview;

  const plaintext = await decryptPreview({
    content: lastMessage.content,
    isEncrypted: true,
    iv: lastMessage.iv ?? null,
    senderPublicKey: lastMessage.sender_public_key ?? null,
    recipientKey: lastMessage.recipient_key
      ? { wrappedKey: lastMessage.recipient_key.wrapped_key, wrapIv: lastMessage.recipient_key.wrap_iv }
      : null,
  });
  return plaintext.slice(0, 120);
}

async function mapSummary(conversation: ApiConversationSummary): Promise<ConversationPreview> {
  return {
    id: conversation.id,
    type: conversation.type,
    name: conversation.name,
    avatarUrl: conversation.avatar_url,
    lastMessagePreview: await resolvePreviewText(conversation),
    lastMessageAt: conversation.last_message_at,
    unreadCount: conversation.unread_count,
    memberCount: conversation.member_count,
    isPinned: conversation.is_pinned,
    isMuted: conversation.is_muted,
  };
}

function mapMember(member: ApiMember): ConversationMember {
  return {
    id: member.id,
    userId: member.user_id,
    role: member.role,
    user: mapUser(member.user),
    joinedAt: member.joined_at,
  };
}

async function mapConversation(conversation: ApiConversation): Promise<Conversation> {
  const summary = await mapSummary(conversation);
  const members = conversation.members.map(mapMember);
  return {
    ...summary,
    participants: members.map((member) => member.user),
    members,
    lastMessage: null,
    description: conversation.description,
    createdAt: conversation.created_at,
    updatedAt: conversation.updated_at,
  };
}

export async function listConversations(): Promise<ConversationPreview[]> {
  const summaries = await apiGet<ApiConversationSummary[]>("/api/conversations/");
  return Promise.all(summaries.map(mapSummary));
}

export async function getConversation(id: string): Promise<Conversation> {
  return mapConversation(await apiGet<ApiConversation>(`/api/conversations/${id}`));
}

export async function createDirectConversation(otherUserId: string): Promise<Conversation> {
  return mapConversation(
    await apiPost<ApiConversation>("/api/conversations/direct", {
      other_user_id: otherUserId,
    })
  );
}

export async function createGroupConversation(name: string, memberIds: string[]): Promise<Conversation> {
  return mapConversation(
    await apiPost<ApiConversation>("/api/groups/", {
      name,
      member_ids: memberIds,
    })
  );
}

export async function getConversationMessages(
  conversationId: string,
  page = 1,
  pageSize = 50
): Promise<MessagePage> {
  const history = await apiGet<ApiMessageHistory>(
    `/api/conversations/${conversationId}/messages?page=${page}&page_size=${pageSize}`
  );
  return {
    messages: history.messages.map(mapMessage),
    hasMore: history.pagination.has_next,
    nextCursor: null,
    page: history.pagination.page,
    pageSize: history.pagination.page_size,
    total: history.pagination.total,
  };
}

// --- Group management (groups are just conversations with admin-gated membership) ---

export async function removeMember(groupId: string, userId: string): Promise<void> {
  await apiDelete(`/api/groups/${groupId}/members/${userId}`);
}

export async function updateMemberRole(
  groupId: string,
  userId: string,
  role: "admin" | "member"
): Promise<void> {
  await apiPatch(`/api/groups/${groupId}/members/${userId}`, { role });
}

export async function leaveGroup(groupId: string): Promise<void> {
  await apiPost(`/api/groups/${groupId}/leave`);
}
