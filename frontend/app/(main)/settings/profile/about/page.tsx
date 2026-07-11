"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Smile } from "lucide-react";
import { SettingsSubPage } from "@/components/settings/SettingsSubPage";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { updateProfile } from "@/lib/users";

const SUGGESTIONS = [
  { emoji: "👋", label: "Speak Freely" },
  { emoji: "🤐", label: "Encrypted" },
  { emoji: "👍", label: "Free to chat" },
  { emoji: "☕", label: "Coffee lover" },
  { emoji: "🔴", label: "Taking a break" },
];

export default function EditAboutPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const addToast = useUIStore((state) => state.addToast);
  const [bio, setBio] = useState(user?.bio ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await updateProfile({ bio });
      setUser(updated);
      router.back();
    } catch {
      addToast({ message: "Could not update about", variant: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SettingsSubPage title="About">
      <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2.5">
        <Smile className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        <input
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Write something about yourself..."
          className="w-full bg-transparent text-sm focus:outline-none"
        />
      </div>

      <div className="mt-2">
        {SUGGESTIONS.map(({ emoji, label }) => (
          <button
            key={label}
            onClick={() => setBio(`${emoji} ${label}`)}
            className="flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left text-sm hover:bg-secondary"
          >
            <span>{emoji}</span>
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button
          onClick={() => router.back()}
          className="rounded-full bg-secondary px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </SettingsSubPage>
  );
}
