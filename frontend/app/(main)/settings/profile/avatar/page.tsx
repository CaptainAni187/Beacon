"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Image as ImageIcon, Type } from "lucide-react";
import { SettingsSubPage } from "@/components/settings/SettingsSubPage";
import { Avatar } from "@/components/shared/Avatar";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { updateProfile } from "@/lib/users";
import { cn } from "@/lib/utils";

const AVATAR_OPTIONS = [
  "/avatars/avatar-1.svg",
  "/avatars/avatar-2.svg",
  "/avatars/avatar-3.svg",
  "/avatars/avatar-4.svg",
  "/avatars/avatar-5.svg",
  "/avatars/avatar-6.svg",
];

export default function EditAvatarPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const addToast = useUIStore((state) => state.addToast);
  const [mode, setMode] = useState<"photo" | "text">(user?.avatarUrl ? "photo" : "text");
  const [selected, setSelected] = useState<string | null>(user?.avatarUrl ?? null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await updateProfile({ avatarUrl: mode === "photo" ? selected ?? "" : "" });
      setUser(updated);
      router.back();
    } catch {
      addToast({ message: "Could not update avatar", variant: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SettingsSubPage title="Your Avatar">
      <div className="flex flex-col items-center">
        <Avatar
          src={mode === "photo" ? selected : null}
          name={user?.displayName ?? "?"}
          size="xl"
        />
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setMode("photo")}
            className={cn(
              "flex flex-col items-center gap-1 rounded-md px-3 py-1.5 text-xs",
              mode === "photo" ? "bg-secondary font-medium" : "text-muted-foreground"
            )}
          >
            <ImageIcon className="h-4 w-4" /> Photo
          </button>
          <button
            onClick={() => setMode("text")}
            className={cn(
              "flex flex-col items-center gap-1 rounded-md px-3 py-1.5 text-xs",
              mode === "text" ? "bg-secondary font-medium" : "text-muted-foreground"
            )}
          >
            <Type className="h-4 w-4" /> Text
          </button>
        </div>
      </div>

      <div className="my-6 border-t border-border" />

      {mode === "photo" && (
        <>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Select an avatar
          </p>
          <div className="grid grid-cols-5 gap-3">
            {AVATAR_OPTIONS.map((url) => (
              <button
                key={url}
                onClick={() => setSelected(url)}
                className={cn(
                  "rounded-full p-1 transition-all",
                  selected === url ? "ring-2 ring-primary" : "hover:ring-2 hover:ring-border"
                )}
              >
                <Avatar src={url} name="Avatar" size="lg" />
              </button>
            ))}
          </div>
        </>
      )}

      <div className="mt-8 flex justify-end gap-2">
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
