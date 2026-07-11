import { create } from "zustand";
import { socket } from "@/lib/socket";
import { createPeerConnection, getLocalMedia, stopStream } from "@/lib/webrtc";
import { leaveCall as leaveCallApi, startCall as startCallApi } from "@/lib/calls";
import { useUIStore } from "@/store/uiStore";

function getPreferredMedia(video: boolean) {
  const { videoDeviceId, microphoneDeviceId } = useUIStore.getState().calls;
  return { audio: true, video, videoDeviceId, microphoneDeviceId };
}

export type CallPhase = "idle" | "outgoing" | "incoming" | "connecting" | "active";
export type CallKind = "voice" | "video";

export interface CallTarget {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

interface PeerEntry {
  connection: RTCPeerConnection;
  stream: MediaStream | null;
  displayName: string;
  avatarUrl: string | null;
}

interface IncomingCall {
  callId: string;
  fromUserId: string;
  fromName: string;
  type: CallKind;
  conversationId?: string;
}

interface CallState {
  phase: CallPhase;
  type: CallKind;
  callId: string | null;
  roomKey: string | null;
  title: string;
  localStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  peers: Record<string, PeerEntry>;
  incomingCall: IncomingCall | null;
  error: string | null;
}

interface CallActions {
  startDirectCall: (params: { conversationId: string; type: CallKind; targets: CallTarget[] }) => Promise<void>;
  handleRing: (payload: Record<string, unknown>) => void;
  acceptIncoming: () => Promise<void>;
  declineIncoming: () => void;
  handleAccept: (payload: Record<string, unknown>) => Promise<void>;
  handleDecline: () => void;
  handleOffer: (payload: Record<string, unknown>) => Promise<void>;
  handleAnswer: (payload: Record<string, unknown>) => Promise<void>;
  handleIceCandidate: (payload: Record<string, unknown>) => Promise<void>;
  joinRoom: (params: { roomKey: string; type: CallKind; title: string }) => Promise<void>;
  handleRoomPeers: (payload: Record<string, unknown>) => Promise<void>;
  handleRoomPeerJoined: (payload: Record<string, unknown>) => void;
  handleRoomPeerLeft: (payload: Record<string, unknown>) => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  endCall: () => void;
}

type CallStore = CallState & CallActions;

const initialState: CallState = {
  phase: "idle",
  type: "voice",
  callId: null,
  roomKey: null,
  title: "",
  localStream: null,
  isMuted: false,
  isCameraOff: false,
  peers: {},
  incomingCall: null,
  error: null,
};

let pendingTargets: CallTarget[] = [];
let pendingConversationId: string | null = null;

function attachLocalTracks(connection: RTCPeerConnection, stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => connection.addTrack(track, stream));
}

function wireConnectionEvents(
  connection: RTCPeerConnection,
  userId: string,
  toRoomKeyOrCallId: { callId: string | null; roomKey: string | null }
): void {
  connection.onicecandidate = (event) => {
    if (!event.candidate) return;
    socket.send("call.ice-candidate", {
      call_id: toRoomKeyOrCallId.callId,
      room_key: toRoomKeyOrCallId.roomKey,
      to_user_id: userId,
      candidate: event.candidate.toJSON(),
    });
  };
  connection.ontrack = (event) => {
    useCallStore.setState((state) => ({
      peers: {
        ...state.peers,
        [userId]: { ...state.peers[userId], stream: event.streams[0] ?? null },
      },
    }));
  };
  connection.onconnectionstatechange = () => {
    if (connection.connectionState === "connected") {
      useCallStore.setState({ phase: "active" });
    }
    if (["failed", "closed", "disconnected"].includes(connection.connectionState)) {
      useCallStore.getState().handleRoomPeerLeft({ userId });
    }
  };
}

export const useCallStore = create<CallStore>((set, get) => ({
  ...initialState,

  startDirectCall: async ({ conversationId, type, targets }) => {
    try {
      const localStream = await getLocalMedia(getPreferredMedia(type === "video"));
      const call = await startCallApi({ conversationId, type });
      pendingTargets = targets;
      pendingConversationId = conversationId;

      set({
        phase: "outgoing",
        type,
        callId: call.id,
        roomKey: null,
        title: targets.map((t) => t.displayName).join(", "),
        localStream,
        peers: {},
        error: null,
      });

      for (const target of targets) {
        socket.send("call.invite", {
          call_id: call.id,
          to_user_id: target.userId,
          type,
          conversation_id: conversationId,
        });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Could not start call" });
    }
  },

  handleRing: (payload) => {
    if (get().phase !== "idle") return; // already on a call — a real app would show "busy"
    set({
      phase: "incoming",
      type: (payload.type as CallKind) ?? "voice",
      incomingCall: {
        callId: String(payload.call_id ?? payload.callId ?? ""),
        fromUserId: String(payload.fromUserId ?? ""),
        fromName: String(payload.fromName ?? "Unknown"),
        type: (payload.type as CallKind) ?? "voice",
        conversationId: payload.conversation_id as string | undefined,
      },
    });
  },

  acceptIncoming: async () => {
    const { incomingCall } = get();
    if (!incomingCall) return;
    try {
      const localStream = await getLocalMedia(getPreferredMedia(incomingCall.type === "video"));
      set({
        phase: "connecting",
        callId: incomingCall.callId,
        title: incomingCall.fromName,
        localStream,
        incomingCall: null,
      });
      socket.send("call.accept", { call_id: incomingCall.callId, to_user_id: incomingCall.fromUserId });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Could not access camera/microphone" });
    }
  },

  declineIncoming: () => {
    const { incomingCall } = get();
    if (!incomingCall) return;
    socket.send("call.decline", { call_id: incomingCall.callId, to_user_id: incomingCall.fromUserId });
    set({ incomingCall: null, phase: "idle" });
  },

  handleAccept: async (payload) => {
    const fromUserId = String(payload.fromUserId ?? "");
    const { callId, localStream, type } = get();
    const target = pendingTargets.find((t) => t.userId === fromUserId);

    const connection = createPeerConnection();
    wireConnectionEvents(connection, fromUserId, { callId, roomKey: null });
    attachLocalTracks(connection, localStream);

    set((state) => ({
      phase: "connecting",
      peers: {
        ...state.peers,
        [fromUserId]: {
          connection,
          stream: null,
          displayName: target?.displayName ?? "Participant",
          avatarUrl: target?.avatarUrl ?? null,
        },
      },
    }));

    const offer = await connection.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: type === "video" });
    await connection.setLocalDescription(offer);
    socket.send("call.offer", { call_id: callId, to_user_id: fromUserId, sdp: offer.sdp, sdpType: offer.type });
  },

  handleDecline: () => {
    get().endCall();
  },

  handleOffer: async (payload) => {
    const fromUserId = String(payload.fromUserId ?? "");
    const callId = (payload.call_id as string) ?? get().callId;
    const roomKey = (payload.room_key as string) ?? get().roomKey;
    const { localStream, type, peers } = get();

    let entry = peers[fromUserId];
    if (!entry) {
      const connection = createPeerConnection();
      wireConnectionEvents(connection, fromUserId, { callId, roomKey });
      attachLocalTracks(connection, localStream);
      entry = { connection, stream: null, displayName: "Participant", avatarUrl: null };
      set((state) => ({ peers: { ...state.peers, [fromUserId]: entry } }));
    }

    await entry.connection.setRemoteDescription({
      type: "offer",
      sdp: payload.sdp as string,
    });
    const answer = await entry.connection.createAnswer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: type === "video",
    });
    await entry.connection.setLocalDescription(answer);
    socket.send("call.answer", {
      call_id: callId,
      room_key: roomKey,
      to_user_id: fromUserId,
      sdp: answer.sdp,
      sdpType: answer.type,
    });
    set({ phase: "connecting" });
  },

  handleAnswer: async (payload) => {
    const fromUserId = String(payload.fromUserId ?? "");
    const entry = get().peers[fromUserId];
    if (!entry) return;
    await entry.connection.setRemoteDescription({ type: "answer", sdp: payload.sdp as string });
  },

  handleIceCandidate: async (payload) => {
    const fromUserId = String(payload.fromUserId ?? "");
    const entry = get().peers[fromUserId];
    if (!entry || !payload.candidate) return;
    try {
      await entry.connection.addIceCandidate(payload.candidate as RTCIceCandidateInit);
    } catch {
      // Benign if it arrives after the connection already closed.
    }
  },

  joinRoom: async ({ roomKey, type, title }) => {
    try {
      const localStream = await getLocalMedia(getPreferredMedia(type === "video"));
      set({
        phase: "connecting",
        type,
        roomKey,
        callId: null,
        title,
        localStream,
        peers: {},
        error: null,
      });
      socket.send("call.room.join", { room_key: roomKey });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Could not access camera/microphone" });
    }
  },

  handleRoomPeers: async (payload) => {
    const peerIds = (payload.peers as string[]) ?? [];
    const { roomKey, localStream, type } = get();
    for (const peerId of peerIds) {
      const connection = createPeerConnection();
      wireConnectionEvents(connection, peerId, { callId: null, roomKey });
      attachLocalTracks(connection, localStream);
      set((state) => ({
        peers: {
          ...state.peers,
          [peerId]: { connection, stream: null, displayName: "Participant", avatarUrl: null },
        },
      }));
      const offer = await connection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: type === "video",
      });
      await connection.setLocalDescription(offer);
      socket.send("call.offer", { room_key: roomKey, to_user_id: peerId, sdp: offer.sdp, sdpType: offer.type });
    }
    if (peerIds.length > 0) set({ phase: "connecting" });
    else set({ phase: "active" });
  },

  handleRoomPeerJoined: (payload) => {
    const userId = String(payload.userId ?? "");
    const displayName = String(payload.displayName ?? "Participant");
    set((state) => ({
      peers: {
        ...state.peers,
        [userId]: state.peers[userId] ?? {
          connection: createPeerConnection(),
          stream: null,
          displayName,
          avatarUrl: null,
        },
      },
    }));
  },

  handleRoomPeerLeft: (payload) => {
    const userId = String(payload.userId ?? "");
    set((state) => {
      state.peers[userId]?.connection.close();
      const { [userId]: _removed, ...rest } = state.peers;
      return { peers: rest };
    });
  },

  toggleMute: () => {
    const { localStream, isMuted } = get();
    localStream?.getAudioTracks().forEach((track) => (track.enabled = isMuted));
    set({ isMuted: !isMuted });
  },

  toggleCamera: () => {
    const { localStream, isCameraOff } = get();
    localStream?.getVideoTracks().forEach((track) => (track.enabled = isCameraOff));
    set({ isCameraOff: !isCameraOff });
  },

  endCall: () => {
    const { callId, roomKey, localStream, peers } = get();
    socket.send("call.end", { call_id: callId, room_key: roomKey });
    if (callId) void leaveCallApi(callId).catch(() => undefined);
    Object.values(peers).forEach((peer) => peer.connection.close());
    stopStream(localStream);
    pendingTargets = [];
    pendingConversationId = null;
    set({ ...initialState });
  },
}));

export function getPendingCallConversationId(): string | null {
  return pendingConversationId;
}
