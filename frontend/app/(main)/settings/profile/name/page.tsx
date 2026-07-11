"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { X } from "lucide-react";
import { SettingsSubPage } from "@/components/settings/SettingsSubPage";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { updateProfile } from "@/lib/users";

export default function EditNamePage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const addToast = useUIStore((state) => state.addToast);
  const [firstName, ...rest] = (user?.displayName ?? "").split(" ");
  const [first, setFirst] = useState(firstName ?? "");
  const [last, setLast] = useState(rest.join(" "));
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await updateProfile({ displayName: [first, last].filter(Boolean).join(" ") });
      setUser(updated);
      router.back();
    } catch {
      addToast({ message: "Could not update name", variant: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SettingsSubPage title="Your Name">
      <div className="space-y-3">
        {[
          { label: "First name", value: first, onChange: setFirst },
          { label: "Last name", value: last, onChange: setLast },
        ].map(({ label, value, onChange }) => (
          <div key={label} className="relative">
            <input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={label}
              className="w-full rounded-md border border-border bg-background px-3 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {value && (
              <button
                onClick={() => onChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={`Clear ${label}`}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
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
          disabled={isSaving || !first.trim()}
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </SettingsSubPage>
  );
}
