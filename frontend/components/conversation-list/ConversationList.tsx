"use client";

import {
  Archive,
  ChevronRight,
  FolderPlus,
  MoonStar,
  MoreHorizontal,
  PencilLine,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useConversations } from "@/hooks/useConversations";
import { useUIStore } from "@/store/uiStore";
import { SearchBar } from "./SearchBar";
import { ConversationItem } from "./ConversationItem";
import { NewChatPanel } from "./NewChatPanel";
import { ComingSoonModal } from "@/components/shared/ComingSoonModal";
import { CreateGroupModal } from "@/components/group/CreateGroupModal";
import { cn } from "@/lib/utils";

/**
 * Scrollable list of user conversations in the sidebar, styled after
 * Signal desktop's chat list: header with compose/overflow actions,
 * search + unread filter, and a "New chat" panel that swaps in place.
 */
export function ConversationList() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationSubmenuOpen, setIsNotificationSubmenuOpen] = useState(false);
  const [comingSoon, setComingSoon] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);

  const { conversations, isLoading, selectConversation, activeConversationId } =
    useConversations();

  const filteredConversations = useMemo(() => {
    let list = conversations;
    if (unreadOnly) list = list.filter((c) => c.unreadCount > 0);

    const normalized = query.trim().toLowerCase();
    if (normalized) {
      list = list.filter((conversation) =>
        [conversation.name, conversation.lastMessagePreview, conversation.type].some((value) =>
          value?.toLowerCase().includes(normalized)
        )
      );
    }
    return list;
  }, [conversations, query, unreadOnly]);

  const handleSelect = (id: string) => {
    selectConversation(id);
    router.push(`/chat/${id}`);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    setIsNotificationSubmenuOpen(false);
  };

  if (isNewChatOpen) {
    return <NewChatPanel onClose={() => setIsNewChatOpen(false)} />;
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3",
          !sidebarOpen && "md:pl-14"
        )}
      >
        <h1 className="text-xl font-bold">Chats</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsNewChatOpen(true)}
            className="rounded-md p-2 text-foreground/80 hover:bg-secondary"
            aria-label="New chat"
          >
            <PencilLine className="h-[18px] w-[18px]" />
          </button>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen((open) => !open)}
              className="rounded-md p-2 text-foreground/80 hover:bg-secondary"
              aria-label="More options"
            >
              <MoreHorizontal className="h-[18px] w-[18px]" />
            </button>
            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={closeMenu} />
                <div className="absolute right-0 top-9 z-20 w-56 rounded-lg border border-border bg-background py-1 shadow-xl">
                  <button
                    onClick={() => {
                      setComingSoon("Archived chats");
                      closeMenu();
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-secondary"
                  >
                    <Archive className="h-4 w-4" /> View Archive
                  </button>
                  <button
                    onClick={() => {
                      setComingSoon("Chat folders");
                      closeMenu();
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-secondary"
                  >
                    <FolderPlus className="h-4 w-4" /> Add chat folder
                  </button>
                  <div
                    className="relative"
                    onMouseEnter={() => setIsNotificationSubmenuOpen(true)}
                    onMouseLeave={() => setIsNotificationSubmenuOpen(false)}
                  >
                    <button className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-secondary">
                      <span className="flex items-center gap-3">
                        <MoonStar className="h-4 w-4" /> Notification profile
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                    {isNotificationSubmenuOpen && (
                      <div className="absolute right-full top-0 w-48 rounded-lg border border-border bg-background py-1 shadow-xl">
                        <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                          Notification Profile
                        </p>
                        <Link
                          href="/settings/notifications"
                          onClick={closeMenu}
                          className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-secondary"
                        >
                          <Settings className="h-4 w-4" /> Settings
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="px-3 pb-3">
        <SearchBar
          value={query}
          onChange={setQuery}
          filterActive={unreadOnly}
          onToggleFilter={() => setUnreadOnly((v) => !v)}
        />
      </div>

      {unreadOnly && (
        <p className="px-4 pb-2 text-sm font-semibold">Filtered by unread</p>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading ? (
          <p className="p-4 text-center text-sm text-muted-foreground">Loading…</p>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
            <p className="font-medium text-foreground">
              {unreadOnly ? "No unread chats" : "No chats"}
            </p>
            {!unreadOnly && (
              <p className="text-sm text-muted-foreground">Recent chats will appear here.</p>
            )}
            {unreadOnly && (
              <button
                onClick={() => setUnreadOnly(false)}
                className="rounded-full bg-secondary px-4 py-1.5 text-sm font-medium hover:bg-accent"
              >
                Clear filter
              </button>
            )}
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isActive={conversation.id === activeConversationId}
              onClick={() => handleSelect(conversation.id)}
            />
          ))
        )}
      </div>

      <CreateGroupModal />
      <ComingSoonModal
        isOpen={comingSoon !== null}
        onClose={() => setComingSoon(null)}
        feature={comingSoon ?? ""}
      />
    </div>
  );
}
