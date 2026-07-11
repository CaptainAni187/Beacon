"use client";

import { useCallback, useEffect } from "react";
import { useConversationStore } from "@/store/conversationStore";

/**
 * Conversations hook.
 * Provides conversation list state and CRUD actions.
 * TODO: Fetch conversations from API on mount once endpoints are implemented.
 */
export function useConversations() {
  const {
    conversations,
    activeConversationId,
    activeConversation,
    isLoading,
    error,
    fetchConversations,
    fetchConversation,
    createDirectConversation,
    createGroupConversation,
    setActiveConversationId,
    addConversation,
    updateConversation,
    removeConversation,
    markAsRead,
  } = useConversationStore();

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const selectConversation = useCallback(
    (id: string) => {
      setActiveConversationId(id);
      markAsRead(id);
    },
    [setActiveConversationId, markAsRead]
  );

  return {
    conversations,
    activeConversationId,
    activeConversation,
    isLoading,
    error,
    selectConversation,
    addConversation,
    updateConversation,
    removeConversation,
    refresh: fetchConversations,
    fetchConversation,
    createDirectConversation,
    createGroupConversation,
  };
}
