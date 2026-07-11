import { create } from "zustand";
import * as conversationApi from "@/lib/conversations";
import type { Conversation, ConversationPreview } from "@/types/conversation";

interface ConversationState {
  conversations: ConversationPreview[];
  activeConversationId: string | null;
  activeConversation: Conversation | null;
  isLoading: boolean;
  error: string | null;
}

interface ConversationActions {
  setConversations: (conversations: ConversationPreview[]) => void;
  setActiveConversation: (conversation: Conversation | null) => void;
  setActiveConversationId: (id: string | null) => void;
  addConversation: (conversation: ConversationPreview) => void;
  updateConversation: (id: string, updates: Partial<ConversationPreview>) => void;
  removeConversation: (id: string) => void;
  markAsRead: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchConversations: () => Promise<void>;
  fetchConversation: (id: string) => Promise<Conversation>;
  createDirectConversation: (otherUserId: string) => Promise<Conversation>;
  createGroupConversation: (name: string, memberIds: string[]) => Promise<Conversation>;
  reset: () => void;
}

type ConversationStore = ConversationState & ConversationActions;

const initialState: ConversationState = {
  conversations: [],
  activeConversationId: null,
  activeConversation: null,
  isLoading: false,
  error: null,
};

export const useConversationStore = create<ConversationStore>((set, get) => ({
  ...initialState,

  setConversations: (conversations) => set({ conversations, error: null }),

  setActiveConversation: (activeConversation) =>
    set({
      activeConversation,
      activeConversationId: activeConversation?.id ?? null,
    }),

  setActiveConversationId: (activeConversationId) =>
    set({ activeConversationId }),

  addConversation: (conversation) =>
    set((state) => ({
      conversations: [conversation, ...state.conversations],
    })),

  updateConversation: (id, updates) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })),

  removeConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      activeConversationId:
        state.activeConversationId === id ? null : state.activeConversationId,
      activeConversation:
        state.activeConversation?.id === id ? null : state.activeConversation,
    })),

  markAsRead: (id) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, unreadCount: 0 } : c
      ),
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),

  fetchConversations: async () => {
    set({ isLoading: true, error: null });
    try {
      const conversations = await conversationApi.listConversations();
      set({ isLoading: false, conversations });
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) });
    }
  },

  fetchConversation: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const conversation = await conversationApi.getConversation(id);
      set({ activeConversation: conversation, activeConversationId: id, isLoading: false });
      return conversation;
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) });
      throw error;
    }
  },

  createDirectConversation: async (otherUserId) => {
    const conversation = await conversationApi.createDirectConversation(otherUserId);
    await get().fetchConversations();
    set({ activeConversation: conversation, activeConversationId: conversation.id });
    return conversation;
  },

  createGroupConversation: async (name, memberIds) => {
    const conversation = await conversationApi.createGroupConversation(name, memberIds);
    await get().fetchConversations();
    set({ activeConversation: conversation, activeConversationId: conversation.id });
    return conversation;
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
