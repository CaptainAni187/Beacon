"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { formatRelativeTime } from "@/lib/utils";
import { viewStory, type Story } from "@/lib/stories";

const STORY_DURATION_MS = 5000;

export interface StoryViewerProps {
  stories: Story[];
  startIndex: number;
  onClose: () => void;
}

export function StoryViewer({ stories, startIndex, onClose }: StoryViewerProps) {
  const [index, setIndex] = useState(startIndex);
  const story = stories[index];

  useEffect(() => {
    if (!story) return;
    void viewStory(story.id).catch(() => undefined);
  }, [story]);

  useEffect(() => {
    if (!story) return;
    const timeout = setTimeout(() => {
      if (index < stories.length - 1) setIndex(index + 1);
      else onClose();
    }, STORY_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [index, story, stories.length, onClose]);

  if (!story) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <div className="relative flex h-[600px] w-[380px] flex-col overflow-hidden rounded-2xl">
        <div className="absolute left-3 right-3 top-3 z-10 flex gap-1">
          {stories.map((s, i) => (
            <div key={s.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full bg-white transition-all"
                style={{ width: i < index ? "100%" : i === index ? "100%" : "0%" }}
              />
            </div>
          ))}
        </div>

        <div className="absolute left-3 right-3 top-6 z-10 flex items-center gap-2">
          <Avatar src={story.author.avatarUrl} name={story.author.displayName} size="sm" />
          <div>
            <p className="text-sm font-medium text-white">{story.author.displayName}</p>
            <p className="text-xs text-white/70">{formatRelativeTime(story.createdAt)}</p>
          </div>
          <button onClick={onClose} className="ml-auto text-white" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          className="flex flex-1 items-center justify-center p-8 text-center"
          style={{ backgroundColor: story.backgroundColor ?? "#1e1e1e" }}
          onClick={() => (index < stories.length - 1 ? setIndex(index + 1) : onClose())}
        >
          {story.type === "text" && (
            <p className="text-2xl font-semibold text-white">{story.textContent}</p>
          )}
          {story.type === "image" && story.mediaUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={story.mediaUrl} alt="Story" className="max-h-full max-w-full object-contain" />
          )}
          {story.type === "video" && story.mediaUrl && (
            <video src={story.mediaUrl} autoPlay className="max-h-full max-w-full" />
          )}
        </div>

        {index > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIndex(index - 1);
            }}
            className="absolute left-0 top-0 h-full w-1/4"
            aria-label="Previous story"
          />
        )}
      </div>
    </div>
  );
}
