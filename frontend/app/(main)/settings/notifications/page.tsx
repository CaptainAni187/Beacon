"use client";

import { useUIStore, type NotificationContentLevel } from "@/store/uiStore";
import { Checkbox } from "@/components/settings/Checkbox";

const CONTENT_LEVELS: { value: NotificationContentLevel; label: string }[] = [
  { value: "name-content-actions", label: "Name, content, and actions" },
  { value: "name-only", label: "Name only" },
  { value: "none", label: "No name or content" },
];

export default function NotificationSettingsPage() {
  const { notifications, setNotificationSetting, addToast } = useUIStore();

  const requestBrowserPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    await Notification.requestPermission();
  };

  return (
    <div className="mx-auto max-w-xl py-8">
      <h2 className="mb-8 text-center text-lg font-semibold">Notifications</h2>

      <Checkbox
        label="Enable notifications"
        checked={notifications.desktopNotifications}
        onChange={(value) => {
          setNotificationSetting("desktopNotifications", value);
          if (value) void requestBrowserPermission();
        }}
      />
      <Checkbox
        label="Show notifications for calls"
        checked={notifications.showCallNotifications}
        onChange={(value) => setNotificationSetting("showCallNotifications", value)}
      />
      <Checkbox
        label="Include muted chats in badge count"
        checked={notifications.includeMutedInBadge}
        onChange={(value) => setNotificationSetting("includeMutedInBadge", value)}
      />

      <div className="my-4 border-t border-border" />

      <div className="flex items-center justify-between gap-4 py-2">
        <span className="text-sm">Notification content</span>
        <select
          value={notifications.contentLevel}
          onChange={(e) =>
            setNotificationSetting("contentLevel", e.target.value as NotificationContentLevel)
          }
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          {CONTENT_LEVELS.map((level) => (
            <option key={level.value} value={level.value}>
              {level.label}
            </option>
          ))}
        </select>
      </div>

      <div className="my-4 border-t border-border" />

      <Checkbox
        label="Push notification sounds"
        checked={notifications.pushNotificationSounds}
        onChange={(value) => setNotificationSetting("pushNotificationSounds", value)}
      />
      <Checkbox
        label="In-chat message sounds"
        description="Hear a notification sound for sent and received messages while in the chat."
        checked={notifications.inChatMessageSounds}
        onChange={(value) => setNotificationSetting("inChatMessageSounds", value)}
      />

      <div className="my-4 border-t border-border" />

      <div className="flex items-center justify-between gap-4 py-2">
        <div>
          <p className="text-sm font-medium">Notification profiles</p>
          <p className="text-xs text-muted-foreground">
            Create a profile to receive notifications and calls only from the people and groups
            you choose
          </p>
        </div>
        <button
          onClick={() =>
            addToast({ message: "Notification profiles aren't implemented in this demo", variant: "info" })
          }
          className="flex-shrink-0 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium hover:bg-accent"
        >
          Set up
        </button>
      </div>
    </div>
  );
}
