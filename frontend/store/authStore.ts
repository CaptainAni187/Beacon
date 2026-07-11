import { create } from "zustand";
import * as authApi from "@/lib/auth";
import { clearKeyCache, ensureKeyPair } from "@/lib/encryption";
import type { RegisterPayload } from "@/types/user";
import type { User } from "@/types/user";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  pendingOtpEmail: string | null;
}

interface AuthActions {
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  verifyOtp: (email: string, code: string) => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  restoreSession: () => Promise<void>;
  reset: () => void;
}

type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  pendingOtpEmail: null,
};

export const useAuthStore = create<AuthStore>((set) => ({
  ...initialState,

  setUser: (user) =>
    set({ user, isAuthenticated: user !== null, error: null }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login({ email, password });
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        pendingOtpEmail: null,
      });
      await ensureKeyPair(response.user.id, response.user.publicKey);
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    await authApi.logout();
    clearKeyCache();
    set({ ...initialState });
  },

  register: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.register(payload);
      set({
        user: response.user,
        isLoading: false,
        pendingOtpEmail: payload.email,
      });
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) });
      throw error;
    }
  },

  verifyOtp: async (email, code) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.verifyOtp({ email, code });
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        pendingOtpEmail: null,
      });
      await ensureKeyPair(response.user.id, response.user.publicKey);
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) });
      throw error;
    }
  },

  fetchCurrentUser: async () => {
    const user = await authApi.getCurrentUser();
    set({ user, isAuthenticated: true, isLoading: false });
  },

  restoreSession: async () => {
    if (!authApi.isAuthenticated()) return;
    set({ isLoading: true });
    try {
      const user = await authApi.getCurrentUser();
      set({ user, isAuthenticated: true, isLoading: false });
      await ensureKeyPair(user.id, user.publicKey);
    } catch {
      authApi.clearTokens();
      set({ ...initialState });
    }
  },

  reset: () => set(initialState),
}));

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response
  ) {
    const data = error.response.data as { detail?: string };
    if (data.detail) return data.detail;
  }
  return error instanceof Error ? error.message : "Something went wrong";
}
