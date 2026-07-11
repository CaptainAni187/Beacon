"use client";

import { Plus } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { ModalShell } from "@/components/shared/ModalShell";
import { Checkbox } from "@/components/settings/Checkbox";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import type { Story } from "@/lib/stories";

export interface StoryPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  myStories: Story[];
  onNewStory: () => void;
}

export function StoryPrivacyModal({ isOpen, onClose, myStories, onNewStory }: StoryPrivacyModalProps) {
  const user = useAuthStore((state) => state.user);
  const { privacy, setPrivacySetting } = useUIStore();
  const viewerCount = myStories.reduce((total, story) => total + story.viewCount, 0);

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Story privacy" className="max-w-md">
      <p className="text-sm text-muted-foreground">
        Stories automatically disappear after 24 hours. Choose who can view your story or create
        new stories with specific viewers or groups.
      </p>

      <h3 className="mb-2 mt-5 text-sm font-semibold">My Stories</h3>
      <button
        onClick={() => {
          onClose();
          onNewStory();
        }}
        className="flex w-full items-center gap-3 py-2 text-left text-sm hover:bg-secondary"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
          <Plus className="h-4 w-4" />
        </span>
        New Story
      </button>
      <div className="flex items-center gap-3 py-2 text-sm">
        <Avatar src={user?.avatarUrl ?? null} name={user?.displayName ?? "Me"} size="md" />
        <div>
          <p className="font-medium">My Story</p>
          <p className="text-xs text-muted-foreground">
            All Beacon connections · {viewerCount} viewer{viewerCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="my-4 border-t border-border" />

      <Checkbox
        label="View Receipts"
        description="See and share when stories are viewed. If disabled, you won't see when others view your story."
        checked={privacy.storyViewReceiptsEnabled}
        onChange={(value) => setPrivacySetting("storyViewReceiptsEnabled", value)}
      />

      <div className="mt-5 flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          If you opt out of stories you will no longer be able to share or view stories.
        </p>
        <button
          onClick={() => {
            setPrivacySetting("storiesEnabled", false);
            onClose();
          }}
          className="flex-shrink-0 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-accent"
        >
          Turn off stories
        </button>
      </div>
    </ModalShell>
  );
}
