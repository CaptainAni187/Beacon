"use client";

import { useEffect } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useCallStore } from "@/store/callStore";
import { useUIStore } from "@/store/uiStore";
import { IncomingCallOverlay } from "./IncomingCallOverlay";
import { ActiveCallOverlay } from "./ActiveCallOverlay";

/**
 * App-wide WebRTC signaling listener + call UI overlay, mounted once in
 * the main layout so a call can ring/continue regardless of which
 * screen is currently open.
 */
export function CallManager() {
  const { subscribe } = useWebSocket();
  const phase = useCallStore((state) => state.phase);
  const error = useCallStore((state) => state.error);
  const addToast = useUIStore((state) => state.addToast);
  const {
    handleRing,
    handleAccept,
    handleDecline,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    handleRoomPeers,
    handleRoomPeerJoined,
    handleRoomPeerLeft,
  } = useCallStore.getState();

  useEffect(() => {
    const unsubscribers = [
      subscribe("call.ring", (data) => handleRing(data as Record<string, unknown>)),
      subscribe("call.accept", (data) => void handleAccept(data as Record<string, unknown>)),
      subscribe("call.decline", () => handleDecline()),
      subscribe("call.offer", (data) => void handleOffer(data as Record<string, unknown>)),
      subscribe("call.answer", (data) => void handleAnswer(data as Record<string, unknown>)),
      subscribe("call.ice-candidate", (data) => void handleIceCandidate(data as Record<string, unknown>)),
      subscribe("call.room.peers", (data) => void handleRoomPeers(data as Record<string, unknown>)),
      subscribe("call.room.peer-joined", (data) => handleRoomPeerJoined(data as Record<string, unknown>)),
      subscribe("call.room.peer-left", (data) => handleRoomPeerLeft(data as Record<string, unknown>)),
    ];
    return () => unsubscribers.forEach((unsub) => unsub());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribe]);

  useEffect(() => {
    if (error) {
      addToast({ message: error, variant: "error" });
      useCallStore.setState({ error: null, phase: "idle" });
    }
  }, [error, addToast]);

  if (phase === "incoming") return <IncomingCallOverlay />;
  if (phase === "outgoing" || phase === "connecting" || phase === "active") {
    return <ActiveCallOverlay />;
  }
  return null;
}
