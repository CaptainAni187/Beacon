"use client";

import { useCallback } from "react";
import { socket } from "@/lib/socket";

/**
 * WebSocket pub/sub hook.
 * Connection lifecycle (connect on auth, disconnect on sign-out) is owned by
 * the main layout — this hook only sends/subscribes against the shared socket.
 */
export function useWebSocket() {
  const send = useCallback((type: string, payload: unknown) => {
    socket.send(type, payload);
  }, []);

  const subscribe = useCallback(
    (event: string, callback: (data: unknown) => void) => {
      socket.subscribe(event, callback);
      return () => socket.unsubscribe(event, callback);
    },
    []
  );

  return {
    send,
    subscribe,
    isConnected: () => socket.isConnected(),
  };
}
