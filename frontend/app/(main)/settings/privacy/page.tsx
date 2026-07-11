"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import { listContacts } from "@/lib/contacts";
import { clearTokens } from "@/lib/auth";
import { Checkbox } from "@/components/settings/Checkbox";

const TIMER_OPTIONS = [
  { label: "Off", seconds: 0 },
  { label: "1 day", seconds: 86400 },
  { label: "1 week", seconds: 604800 },
  { label: "4 weeks", seconds: 2419200 },
];

export default function PrivacySettingsPage() {
  const router = useRouter();
  const { privacy, setPrivacySetting, addToast } = useUIStore();
  const { reset } = useAuthStore();
  const [blockedCount, setBlockedCount] = useState(0);
  const [showBlocked, setShowBlocked] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    void listContacts().then((contacts) =>
      setBlockedCount(contacts.filter((c) => c.contactStatus === "blocked").length)
    );
  }, []);

  const handleDeleteData = () => {
    clearTokens();
    reset();
    router.replace("/login");
  };

  return (
    <div className="mx-auto max-w-xl py-8">
      <h2 className="mb-8 text-center text-lg font-semibold">Privacy</h2>

      <div className="flex items-center justify-between gap-4 py-3">
        <div>
          <p className="text-sm font-medium">Phone Number</p>
          <p className="text-xs text-muted-foreground">
            Choose who can see your phone number and who can contact you on Beacon with it.
          </p>
        </div>
        <button
          onClick={() => addToast({ message: "Phone number visibility isn't configurable yet", variant: "info" })}
          className="flex-shrink-0 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium hover:bg-accent"
        >
          Change…
        </button>
      </div>

      <div className="my-4 border-t border-border" />

      <div className="flex items-center justify-between gap-4 py-3">
        <div>
          <p className="text-sm font-medium">Blocked</p>
          <p className="text-xs text-muted-foreground">
            {blockedCount === 0 ? "No users or groups" : `${blockedCount} blocked`}
          </p>
        </div>
        <button
          onClick={() => setShowBlocked(true)}
          disabled={blockedCount === 0}
          className="flex-shrink-0 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium hover:bg-accent disabled:opacity-50"
        >
          View
        </button>
      </div>

      <div className="my-4 border-t border-border" />

      <section>
        <h3 className="mb-1 text-sm font-semibold text-muted-foreground">Messaging</h3>
        <Checkbox
          label="Read receipts"
          description="If disabled, you won't see read receipts from others."
          checked={privacy.readReceiptsEnabled}
          onChange={(value) => setPrivacySetting("readReceiptsEnabled", value)}
        />
        <Checkbox
          label="Typing indicators"
          description="If disabled, you won't see typing indicators from others."
          checked={privacy.typingIndicatorsEnabled}
          onChange={(value) => setPrivacySetting("typingIndicatorsEnabled", value)}
        />
      </section>

      <div className="my-4 border-t border-border" />

      <section className="flex items-center justify-between gap-4 py-3">
        <div>
          <p className="text-sm font-medium">Disappearing messages</p>
          <p className="text-xs text-muted-foreground">
            Default timer for new chats — set a default disappearing message timer for all new
            chats started by you.
          </p>
        </div>
        <select
          value={privacy.defaultDisappearingTimerSeconds}
          onChange={(e) =>
            setPrivacySetting("defaultDisappearingTimerSeconds", Number(e.target.value))
          }
          className="flex-shrink-0 rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          {TIMER_OPTIONS.map((opt) => (
            <option key={opt.seconds} value={opt.seconds}>
              {opt.label}
            </option>
          ))}
        </select>
      </section>

      <div className="my-4 border-t border-border" />

      <section className="flex items-center justify-between gap-4 py-3">
        <div>
          <p className="text-sm font-medium">Stories</p>
          <p className="text-xs text-muted-foreground">
            Share &amp; View Stories — if you opt out of stories you will no longer be able to
            share or view stories.
          </p>
        </div>
        <button
          onClick={() => setPrivacySetting("storiesEnabled", !privacy.storiesEnabled)}
          className="flex-shrink-0 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-accent"
        >
          {privacy.storiesEnabled ? "Turn off stories" : "Turn on stories"}
        </button>
      </section>

      <div className="my-4 border-t border-border" />

      <section>
        <h3 className="mb-1 text-sm font-semibold text-muted-foreground">Advanced</h3>
        <Checkbox
          label="Show status icon"
          description="Show an icon in message details when they were delivered using sealed sender."
          checked={false}
          onChange={() =>
            addToast({ message: "Sealed sender isn't implemented in this demo", variant: "info" })
          }
        />
        <Checkbox
          label="Automatic key verification"
          description="When enabled, Beacon will attempt to automatically verify the encryption of 1:1 chats."
          checked
          onChange={() =>
            addToast({ message: "Key verification isn't implemented in this demo", variant: "info" })
          }
        />
      </section>

      <div className="my-4 border-t border-border" />

      <div className="flex items-center justify-between gap-4 py-3">
        <div>
          <p className="text-sm font-medium">Delete application data</p>
          <p className="text-xs text-muted-foreground">
            This will sign you out and clear your locally stored session and encryption keys on
            this device.
          </p>
        </div>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="flex-shrink-0 rounded-full bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-500/20"
        >
          Delete data
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-80 rounded-lg bg-background p-6 shadow-xl">
            <p className="text-sm font-medium">Delete application data?</p>
            <p className="mt-2 text-xs text-muted-foreground">
              This signs you out of Beacon on this device and clears local settings. It cannot be
              undone from here.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-full bg-secondary px-4 py-1.5 text-sm hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteData}
                className="rounded-full bg-red-500 px-4 py-1.5 text-sm text-white hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showBlocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-80 rounded-lg bg-background p-6 shadow-xl">
            <p className="mb-3 text-sm font-medium">Blocked ({blockedCount})</p>
            <button
              onClick={() => setShowBlocked(false)}
              className="w-full rounded-full bg-secondary px-4 py-1.5 text-sm hover:bg-accent"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
