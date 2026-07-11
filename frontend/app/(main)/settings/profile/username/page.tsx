"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AtSign } from "lucide-react";
import { SettingsSubPage } from "@/components/settings/SettingsSubPage";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";

export default function EditUsernamePage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const addToast = useUIStore((state) => state.addToast);
  const [username, setUsername] = useState(user?.username ?? "");

  const handleSave = () => {
    addToast({ message: "Username changes aren't supported yet", variant: "info" });
    router.back();
  };

  return (
    <SettingsSubPage title="Username">
      <div className="flex flex-col items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
          <AtSign className="h-7 w-7" />
        </div>
        <p className="mt-3 text-sm font-medium">Choose your username</p>
      </div>

      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username"
        className="mt-6 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <p className="mt-2 text-xs text-muted-foreground">
        Usernames are always paired with a set of numbers.{" "}
        <span className="text-primary">Learn More</span>
      </p>

      <div className="mt-6 flex gap-2">
        <button
          onClick={() => router.back()}
          className="rounded-full bg-secondary px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Save
        </button>
      </div>
    </SettingsSubPage>
  );
}
