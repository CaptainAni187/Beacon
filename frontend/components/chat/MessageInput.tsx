"use client";

import { useRef, useState } from "react";
import { Send, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useUIStore } from "@/store/uiStore";
import type { SendMessagePayload } from "@/types/message";

export interface MessageInputProps {
  conversationId: string;
  sendMessage: (payload: SendMessagePayload) => Promise<void>;
}

const EMOTICON_MAP: [RegExp, string][] = [
  [/:-?\)/g, "🙂"],
  [/:-?\(/g, "🙁"],
  [/;-?\)/g, "😉"],
  [/:-?D/g, "😀"],
  [/:-?P/gi, "😛"],
  [/<3/g, "❤️"],
];

export function MessageInput({ conversationId, sendMessage }: MessageInputProps) {
  const [content, setContent] = useState("");
  const { sendTyping } = useTypingIndicator(conversationId);
  const stopTypingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spellCheckEnabled = useUIStore((state) => state.chats.spellCheckEnabled);
  const convertEmoticons = useUIStore((state) => state.chats.convertEmoticonsToEmoji);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    await sendMessage({ conversationId, content: trimmed, type: "text" });
    setContent("");

    if (stopTypingTimeout.current) clearTimeout(stopTypingTimeout.current);
    sendTyping(false);
  };

  const handleChange = (value: string) => {
    const converted = convertEmoticons
      ? EMOTICON_MAP.reduce((text, [pattern, emoji]) => text.replace(pattern, emoji), value)
      : value;
    setContent(converted);

    sendTyping(true);
    if (stopTypingTimeout.current) clearTimeout(stopTypingTimeout.current);
    stopTypingTimeout.current = setTimeout(() => sendTyping(false), 3000);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 border-t border-border p-4"
    >
      <button
        type="button"
        disabled
        className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
        aria-label="Attach file"
      >
        <Paperclip className="h-5 w-5" />
      </button>
      <textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void handleSubmit(e);
          }
        }}
        placeholder="Type a message"
        rows={1}
        spellCheck={spellCheckEnabled}
        className={cn(
          "flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm",
          "focus:outline-none focus:ring-2 focus:ring-ring"
        )}
      />
      <button
        type="submit"
        disabled={!content.trim()}
        className={cn(
          "rounded-md bg-primary p-2 text-primary-foreground",
          "hover:bg-primary/90 disabled:opacity-50"
        )}
        aria-label="Send message"
      >
        <Send className="h-5 w-5" />
      </button>
    </form>
  );
}
