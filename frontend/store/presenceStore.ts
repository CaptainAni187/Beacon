import { create } from "zustand";

export interface PresenceEntry {
  status: "online" | "offline";
  lastSeenAt: string | null;
}

interface PresenceState {
  presence: Record<string, PresenceEntry>;
  setOnline: (userId: string) => void;
  setOffline: (userId: string, lastSeenAt: string | null) => void;
}

/**
 * Tracks live online/offline presence keyed by user id, populated from
 * `user.online` / `user.offline` WebSocket events.
 */
export const usePresenceStore = create<PresenceState>((set) => ({
  presence: {},

  setOnline: (userId) =>
    set((state) => ({
      presence: { ...state.presence, [userId]: { status: "online", lastSeenAt: null } },
    })),

  setOffline: (userId, lastSeenAt) =>
    set((state) => ({
      presence: { ...state.presence, [userId]: { status: "offline", lastSeenAt } },
    })),
}));
