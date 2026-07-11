import { apiDelete, apiGet, apiPost } from "@/lib/api";
import { mapUser } from "@/lib/conversations";
import type { User } from "@/types/user";

export type StoryType = "text" | "image" | "video";

export interface Story {
  id: string;
  author: User;
  type: StoryType;
  textContent: string | null;
  backgroundColor: string | null;
  mediaUrl: string | null;
  createdAt: string;
  expiresAt: string;
  viewCount: number;
  viewedByMe: boolean;
}

export interface StoryFeedGroup {
  author: User;
  stories: Story[];
}

interface ApiStory {
  id: string;
  author: Parameters<typeof mapUser>[0];
  type: StoryType;
  text_content: string | null;
  background_color: string | null;
  media_url: string | null;
  created_at: string;
  expires_at: string;
  view_count: number;
  viewed_by_me: boolean;
}

interface ApiStoryFeedGroup {
  author: Parameters<typeof mapUser>[0];
  stories: ApiStory[];
}

function mapStory(story: ApiStory): Story {
  return {
    id: story.id,
    author: mapUser(story.author),
    type: story.type,
    textContent: story.text_content,
    backgroundColor: story.background_color,
    mediaUrl: story.media_url,
    createdAt: story.created_at,
    expiresAt: story.expires_at,
    viewCount: story.view_count,
    viewedByMe: story.viewed_by_me,
  };
}

export async function getMyStories(): Promise<Story[]> {
  return (await apiGet<ApiStory[]>("/api/stories/me")).map(mapStory);
}

export async function getStoryFeed(): Promise<StoryFeedGroup[]> {
  const groups = await apiGet<ApiStoryFeedGroup[]>("/api/stories/feed");
  return groups.map((group) => ({
    author: mapUser(group.author),
    stories: group.stories.map(mapStory),
  }));
}

export interface CreateStoryPayload {
  type: StoryType;
  textContent?: string;
  backgroundColor?: string;
  mediaUrl?: string;
}

export async function createStory(payload: CreateStoryPayload): Promise<Story> {
  const response = await apiPost<ApiStory>("/api/stories/", {
    type: payload.type,
    text_content: payload.textContent,
    background_color: payload.backgroundColor,
    media_url: payload.mediaUrl,
  });
  return mapStory(response);
}

export async function viewStory(storyId: string): Promise<void> {
  await apiPost(`/api/stories/${storyId}/view`);
}

export async function deleteStory(storyId: string): Promise<void> {
  await apiDelete(`/api/stories/${storyId}`);
}
