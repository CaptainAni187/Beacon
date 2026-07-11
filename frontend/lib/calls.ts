import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { mapUser } from "@/lib/conversations";
import type { User } from "@/types/user";

export interface CallLink {
  id: string;
  name: string | null;
  requiresAdminApproval: boolean;
  roomKey: string;
  createdBy: User;
  createdAt: string;
}

export interface CallParticipant {
  user: User;
  joinedAt: string | null;
  leftAt: string | null;
}

export interface CallRecord {
  id: string;
  conversationId: string | null;
  callLinkId: string | null;
  initiator: User;
  type: "voice" | "video";
  status: "ringing" | "active" | "ended" | "missed" | "declined";
  startedAt: string | null;
  endedAt: string | null;
  participants: CallParticipant[];
  createdAt: string;
}

interface ApiCallLink {
  id: string;
  name: string | null;
  requires_admin_approval: boolean;
  room_key: string;
  created_by: Parameters<typeof mapUser>[0];
  created_at: string;
}

interface ApiCallParticipant {
  user: Parameters<typeof mapUser>[0];
  joined_at: string | null;
  left_at: string | null;
}

interface ApiCall {
  id: string;
  conversation_id: string | null;
  call_link_id: string | null;
  initiator: Parameters<typeof mapUser>[0];
  type: CallRecord["type"];
  status: CallRecord["status"];
  started_at: string | null;
  ended_at: string | null;
  participants: ApiCallParticipant[];
  created_at: string;
}

function mapCallLink(link: ApiCallLink): CallLink {
  return {
    id: link.id,
    name: link.name,
    requiresAdminApproval: link.requires_admin_approval,
    roomKey: link.room_key,
    createdBy: mapUser(link.created_by),
    createdAt: link.created_at,
  };
}

function mapCall(call: ApiCall): CallRecord {
  return {
    id: call.id,
    conversationId: call.conversation_id,
    callLinkId: call.call_link_id,
    initiator: mapUser(call.initiator),
    type: call.type,
    status: call.status,
    startedAt: call.started_at,
    endedAt: call.ended_at,
    participants: call.participants.map((p) => ({
      user: mapUser(p.user),
      joinedAt: p.joined_at,
      leftAt: p.left_at,
    })),
    createdAt: call.created_at,
  };
}

export async function listCalls(): Promise<CallRecord[]> {
  return (await apiGet<ApiCall[]>("/api/calls/")).map(mapCall);
}

export async function startCall(params: {
  conversationId?: string;
  callLinkId?: string;
  type: "voice" | "video";
}): Promise<CallRecord> {
  const response = await apiPost<ApiCall>("/api/calls/", {
    conversation_id: params.conversationId,
    call_link_id: params.callLinkId,
    type: params.type,
  });
  return mapCall(response);
}

export async function leaveCall(callId: string): Promise<void> {
  await apiPost(`/api/calls/${callId}/leave`);
}

export async function clearCallHistory(): Promise<void> {
  await apiDelete("/api/calls/");
}

export async function createCallLink(params: {
  name?: string;
  requiresAdminApproval: boolean;
}): Promise<CallLink> {
  const response = await apiPost<ApiCallLink>("/api/calls/links", {
    name: params.name || undefined,
    requires_admin_approval: params.requiresAdminApproval,
  });
  return mapCallLink(response);
}

export async function getCallLink(callLinkId: string): Promise<CallLink> {
  return mapCallLink(await apiGet<ApiCallLink>(`/api/calls/links/${callLinkId}`));
}

export async function getCallLinkByRoomKey(roomKey: string): Promise<CallLink> {
  return mapCallLink(await apiGet<ApiCallLink>(`/api/calls/links/by-key/${roomKey}`));
}

export async function updateCallLink(
  callLinkId: string,
  params: { name?: string; requiresAdminApproval?: boolean }
): Promise<CallLink> {
  const response = await apiPatch<ApiCallLink>(`/api/calls/links/${callLinkId}`, {
    name: params.name,
    requires_admin_approval: params.requiresAdminApproval,
  });
  return mapCallLink(response);
}
