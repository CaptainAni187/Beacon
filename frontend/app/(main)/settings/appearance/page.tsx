"use client";

import { useRouter } from "next/navigation";
import { useUIStore, type Theme } from "@/store/uiStore";
import { Globe } from "lucide-react";

const THEMES: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

const ZOOM_LEVELS = [80, 90, 100, 110, 125, 150];

/** Appearance settings page: theme, chat accent color, and zoom level. */
export default function AppearanceSettingsPage() {
  const router = useRouter();
  const { theme, setTheme, appearance, setAppearanceSetting } = useUIStore();

  return (
    <div className="mx-auto max-w-xl py-8">
      <h2 className="mb-8 text-center text-lg font-semibold">Appearance</h2>

      <div className="flex items-center justify-between py-3">
        <span className="flex items-center gap-3 text-sm">
          <Globe className="h-4 w-4 text-muted-foreground" /> Language
        </span>
        <span className="text-sm text-muted-foreground">System Language</span>
      </div>

      <div className="flex items-center justify-between py-3">
        <span className="text-sm">Theme</span>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as Theme)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          {THEMES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={() => router.push("/settings/appearance/chat-color")}
        className="flex w-full items-center justify-between py-3 text-left"
      >
        <span className="text-sm">Chat color</span>
        <span
          className="h-6 w-6 flex-shrink-0 rounded-full"
          style={{ background: appearance.chatColor }}
          aria-hidden
        />
      </button>

      <div className="flex items-center justify-between py-3">
        <span className="text-sm">Zoom level</span>
        <select
          value={appearance.zoomLevel}
          onChange={(e) => setAppearanceSetting("zoomLevel", Number(e.target.value))}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          {ZOOM_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}%
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
