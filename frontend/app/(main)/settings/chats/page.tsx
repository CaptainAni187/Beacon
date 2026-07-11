"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useUIStore } from "@/store/uiStore";
import { listConversations, getConversationMessages } from "@/lib/conversations";
import { decryptIncoming } from "@/lib/encryption";
import { Checkbox } from "@/components/settings/Checkbox";
import { cn } from "@/lib/utils";

// Base hand emoji + Fitzpatrick skin-tone modifiers (U+1F3FB–U+1F3FF).
// Emoji glyphs render with their own built-in color and ignore CSS `color`,
// so the tone has to come from the actual codepoint, not a background tint.
const SKIN_TONES = ["✋", "✋🏻", "✋🏼", "✋🏽", "✋🏾", "✋🏿"];

export default function ChatsSettingsPage() {
  const router = useRouter();
  const { chats, setChatSetting, addToast } = useUIStore();
  const [isExporting, setIsExporting] = useState(false);
  const [lastImportAt] = useState(() => new Date().toLocaleString());

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const conversations = await listConversations();
      const exported = await Promise.all(
        conversations.map(async (conversation) => {
          const page = await getConversationMessages(conversation.id);
          const messages = await Promise.all(page.messages.map(decryptIncoming));
          return {
            conversation: { id: conversation.id, name: conversation.name, type: conversation.type },
            messages: messages.map((m) => ({
              sender: m.sender.displayName,
              content: m.content,
              createdAt: m.createdAt,
            })),
          };
        })
      );
      const blob = new Blob([JSON.stringify(exported, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "beacon-chat-export.json";
      link.click();
      URL.revokeObjectURL(url);
      addToast({ message: "Chat history exported", variant: "success" });
    } catch {
      addToast({ message: "Could not export chat history", variant: "error" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl py-8">
      <h2 className="mb-8 text-center text-lg font-semibold">Chats</h2>

      <section>
        <h3 className="mb-1 text-sm font-semibold text-muted-foreground">Chats</h3>
        <Checkbox
          label="Spell check text entered in message composition box"
          checked={chats.spellCheckEnabled}
          onChange={(v) => setChatSetting("spellCheckEnabled", v)}
        />
        <Checkbox
          label="Show text formatting popover when text is selected"
          checked={chats.textFormattingPopoverEnabled}
          onChange={(v) => setChatSetting("textFormattingPopoverEnabled", v)}
        />
        <Checkbox
          label="Generate link previews"
          description="Retrieve link previews directly from websites for messages you send."
          checked={chats.linkPreviewsEnabled}
          onChange={(v) => setChatSetting("linkPreviewsEnabled", v)}
        />
        <Checkbox
          label="Use address book photos"
          description="Display contact photos from your address book if available."
          checked={chats.addressBookPhotosEnabled}
          onChange={(v) => setChatSetting("addressBookPhotosEnabled", v)}
        />
        <Checkbox
          label="Convert typed emoticons to emoji"
          description="For example, :-) will be converted to 🙂"
          checked={chats.convertEmoticonsToEmoji}
          onChange={(v) => setChatSetting("convertEmoticonsToEmoji", v)}
        />
        <Checkbox
          label="Keep muted chats archived"
          description="Muted chats that are archived will remain archived when a new message arrives."
          checked={chats.keepMutedChatsArchived}
          onChange={(v) => setChatSetting("keepMutedChatsArchived", v)}
        />

        <div className="flex items-center justify-between py-3">
          <span className="text-sm">Emoji skin tone</span>
          <div className="flex gap-1.5">
            {SKIN_TONES.map((hand, i) => (
              <button
                key={hand}
                onClick={() => setChatSetting("emojiSkinTone", i)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-lg hover:bg-secondary",
                  chats.emojiSkinTone === i && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                )}
                aria-label={`Skin tone ${i}`}
              >
                {hand}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="my-6 border-t border-border" />

      <div className="flex items-center justify-between gap-4 py-3">
        <div>
          <p className="text-sm font-medium">Chat folders</p>
          <p className="text-xs text-muted-foreground">Add a chat folder</p>
          <p className="text-xs text-muted-foreground">
            Organize your chats into folders and quickly switch between them on your chat list.
          </p>
        </div>
        <button
          onClick={() => router.push("/settings/chats/folders")}
          className="flex-shrink-0 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium hover:bg-accent"
        >
          Set up
        </button>
      </div>

      <div className="my-6 border-t border-border" />

      <div className="flex items-center justify-between gap-4 py-3">
        <div>
          <p className="text-sm font-medium">Export chat history</p>
          <p className="text-xs text-muted-foreground">
            Export a machine-readable JSON copy of all your chats. Disappearing messages will not be
            exported.
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex-shrink-0 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium hover:bg-accent disabled:opacity-50"
        >
          {isExporting ? "Exporting…" : "Export"}
        </button>
      </div>

      <div className="my-6 border-t border-border" />

      <div className="flex items-center justify-between gap-4 py-3">
        <div>
          <p className="text-sm font-medium">Import contacts</p>
          <p className="text-xs text-muted-foreground">
            Import all Beacon groups and contacts from your mobile device. Last import at {lastImportAt}
          </p>
        </div>
        <button
          onClick={() =>
            addToast({ message: "Beacon doesn't have a mobile companion app yet", variant: "info" })
          }
          className="flex-shrink-0 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium hover:bg-accent"
        >
          Import now
        </button>
      </div>
    </div>
  );
}
