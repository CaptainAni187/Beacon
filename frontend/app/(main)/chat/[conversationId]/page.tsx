"use client";

import { useEffect } from "react";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { GroupInfoPanel } from "@/components/group/GroupInfoPanel";
import { useMessages } from "@/hooks/useMessages";

interface ChatPageProps {
  params: { conversationId: string };
}

export default function ChatPage({ params }: ChatPageProps) {
  const { conversationId } = params;
  const { messages, isLoading, fetchMessages, sendMessage } = useMessages(conversationId);

  useEffect(() => {
    void fetchMessages();
  }, [fetchMessages]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ChatHeader conversationId={conversationId} />
      <MessageList messages={messages} isLoading={isLoading} />
      <TypingIndicator conversationId={conversationId} />
      <MessageInput conversationId={conversationId} sendMessage={sendMessage} />
      <GroupInfoPanel />
    </div>
  );
}
