"use client";

import { useUIStore } from "@/store/uiStore";
import { Checkbox } from "@/components/settings/Checkbox";

export default function DataUsageSettingsPage() {
  const { dataUsage, setDataUsageSetting } = useUIStore();

  return (
    <div className="mx-auto max-w-xl py-8">
      <h2 className="mb-8 text-center text-lg font-semibold">Data usage</h2>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Media auto-download</h3>
        {(
          [
            ["autoDownloadPhotos", "Photos"],
            ["autoDownloadVideos", "Videos"],
            ["autoDownloadAudio", "Audio"],
            ["autoDownloadDocuments", "Documents"],
          ] as const
        ).map(([key, label]) => (
          <Checkbox
            key={key}
            label={label}
            checked={dataUsage[key]}
            onChange={(value) => setDataUsageSetting(key, value)}
          />
        ))}
        <p className="mt-1 text-xs text-muted-foreground">
          Voice messages and stickers are always auto-downloaded.
        </p>
      </section>

      <div className="my-6 border-t border-border" />

      <section className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Sent media quality</p>
          <p className="text-xs text-muted-foreground">Sending high quality media will use more data.</p>
        </div>
        <select
          value={dataUsage.sentMediaQuality}
          onChange={(e) =>
            setDataUsageSetting("sentMediaQuality", e.target.value as "standard" | "high")
          }
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="standard">Standard</option>
          <option value="high">High</option>
        </select>
      </section>
    </div>
  );
}
