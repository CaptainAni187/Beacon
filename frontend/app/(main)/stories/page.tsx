"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Lock, ImagePlus, MoreHorizontal, Plus, Type } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { TextStoryComposer } from "@/components/stories/TextStoryComposer";
import { StoryViewer } from "@/components/stories/StoryViewer";
import { StoryPrivacyModal } from "@/components/stories/StoryPrivacyModal";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { uploadFile } from "@/lib/uploads";
import {
  createStory,
  getMyStories,
  getStoryFeed,
  type Story,
  type StoryFeedGroup,
} from "@/lib/stories";
import { formatRelativeTime, cn } from "@/lib/utils";

export default function StoriesPage() {
  const user = useAuthStore((state) => state.user);
  const addToast = useUIStore((state) => state.addToast);
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [feed, setFeed] = useState<StoryFeedGroup[]>([]);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isTextComposerOpen, setIsTextComposerOpen] = useState(false);
  const [isOverflowMenuOpen, setIsOverflowMenuOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [viewerStories, setViewerStories] = useState<Story[] | null>(null);
  const [viewerIndex, setViewerIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const [mine, feedGroups] = await Promise.all([getMyStories(), getStoryFeed()]);
    setMyStories(mine);
    setFeed(feedGroups);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleTextStory = async (text: string, backgroundColor: string) => {
    try {
      await createStory({ type: "text", textContent: text, backgroundColor });
      addToast({ message: "Story posted", variant: "success" });
      await refresh();
    } catch {
      addToast({ message: "Could not post story", variant: "error" });
    }
  };

  const handleFileChosen = async (file: File) => {
    try {
      const uploaded = await uploadFile(file);
      await createStory({
        type: uploaded.mimeType.startsWith("video/") ? "video" : "image",
        mediaUrl: uploaded.url,
      });
      addToast({ message: "Story posted", variant: "success" });
      await refresh();
    } catch {
      addToast({ message: "Could not upload story", variant: "error" });
    }
  };

  return (
    <div className="flex h-full">
      <div className="flex w-[360px] flex-shrink-0 flex-col border-r border-border bg-sidebar">
        <div className={cn("flex items-center justify-between px-4 py-3", !sidebarOpen && "md:pl-14")}>
          <h1 className="text-xl font-bold">Stories</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsAddMenuOpen((open) => !open)}
              className="rounded-md p-2 text-foreground/80 hover:bg-secondary"
              aria-label="Add a story"
            >
              <Plus className="h-4 w-4" />
            </button>
            <div className="relative">
              <button
                onClick={() => setIsOverflowMenuOpen((open) => !open)}
                className="rounded-md p-2 text-foreground/80 hover:bg-secondary"
                aria-label="More options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {isOverflowMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsOverflowMenuOpen(false)} />
                  <div className="absolute right-0 top-9 z-20 w-48 rounded-lg border border-border bg-background py-1 shadow-xl">
                    <button
                      onClick={() => {
                        setIsOverflowMenuOpen(false);
                        setIsPrivacyModalOpen(true);
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-secondary"
                    >
                      <Lock className="h-4 w-4" /> Story privacy
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setIsAddMenuOpen((open) => !open)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-secondary"
          >
            <div className="relative">
              <Avatar src={user?.avatarUrl ?? null} name={user?.displayName ?? "Me"} size="md" />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white">
                <Plus className="h-2.5 w-2.5" />
              </span>
            </div>
            <div>
              <p className="text-sm font-medium">My Story</p>
              <p className="text-xs text-muted-foreground">
                {myStories.length > 0 ? `${myStories.length} update(s)` : "Add a story"}
              </p>
            </div>
          </button>

          {isAddMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsAddMenuOpen(false)} />
              <div className="absolute left-4 top-16 z-20 w-48 rounded-lg border border-border bg-background py-1 shadow-xl">
                <button
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-secondary"
                >
                  <ImagePlus className="h-4 w-4" /> Photo or video
                </button>
                <button
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    setIsTextComposerOpen(true);
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-secondary"
                >
                  <Type className="h-4 w-4" /> Text story
                </button>
              </div>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFileChosen(file);
            e.target.value = "";
          }}
        />

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {feed.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
              <p className="font-medium">No stories</p>
              <p className="text-sm text-muted-foreground">New updates will appear here.</p>
            </div>
          ) : (
            feed.map((group) => (
              <button
                key={group.author.id}
                onClick={() => {
                  setViewerStories(group.stories);
                  setViewerIndex(0);
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-secondary"
              >
                <Avatar src={group.author.avatarUrl} name={group.author.displayName} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{group.author.displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatRelativeTime(group.stories[group.stories.length - 1]?.createdAt)}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border">
          <Plus className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Click + to add an update.</p>
      </div>

      {isTextComposerOpen && (
        <TextStoryComposer onClose={() => setIsTextComposerOpen(false)} onSubmit={handleTextStory} />
      )}

      <StoryPrivacyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        myStories={myStories}
        onNewStory={() => setIsAddMenuOpen(true)}
      />

      {viewerStories && (
        <StoryViewer
          stories={viewerStories}
          startIndex={viewerIndex}
          onClose={() => setViewerStories(null)}
        />
      )}
    </div>
  );
}
