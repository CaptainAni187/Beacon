"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronLeft } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";

const DEFAULT_COLOR = "#3a76f0";

// Solid swatches followed by a couple of gradient options, matching
// Signal's chat-color picker layout (a grid, not a short inline row).
const SOLID_COLORS = [
  DEFAULT_COLOR,
  "#e0245e",
  "#e0722a",
  "#7d7256",
  "#2f8f4e",
  "#1f9c73",
  "#1f9c9c",
  "#3f76a8",
  "#6c5fc7",
  "#9c3fc7",
  "#c23f8f",
  "#a8615a",
  "#6b7280",
  "#c2660f",
];

const GRADIENTS = [
  "linear-gradient(135deg, #4b4453, #6b6178)",
  "linear-gradient(135deg, #e07a5f, #f2cc8f)",
  "linear-gradient(135deg, #1f9c9c, #3f76a8)",
  "linear-gradient(135deg, #9c3fc7, #c23f8f)",
  "linear-gradient(135deg, #2f8f4e, #1f9c9c)",
  "linear-gradient(135deg, #6c5fc7, #3f76a8)",
];

export default function ChatColorPage() {
  const router = useRouter();
  const { appearance, setAppearanceSetting } = useUIStore();
  const swatches = [...SOLID_COLORS, ...GRADIENTS];

  return (
    <div className="relative mx-auto max-w-2xl py-8">
      <button
        onClick={() => router.back()}
        className="absolute left-0 top-8 rounded-md p-1.5 text-muted-foreground hover:text-foreground"
        aria-label="Back"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <h2 className="mb-8 text-center text-lg font-semibold">Chat Color</h2>

      <div className="mb-6 space-y-2 rounded-lg border border-border p-4">
        <div className="flex justify-start">
          <div className="max-w-xs rounded-lg bg-secondary px-4 py-2 text-sm text-secondary-foreground">
            Here&apos;s a preview of the chat color.
          </div>
        </div>
        <div className="flex justify-end">
          <div
            className="max-w-xs rounded-lg px-4 py-2 text-sm text-white"
            style={{ background: appearance.chatColor }}
          >
            The color is visible to only you.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-10 gap-3">
        {swatches.map((color) => (
          <button
            key={color}
            onClick={() => setAppearanceSetting("chatColor", color)}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-all",
              appearance.chatColor === color && "ring-2 ring-primary"
            )}
            style={{ background: color }}
            aria-label={`Chat color ${color}`}
          >
            {appearance.chatColor === color && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
          </button>
        ))}
      </div>

      <div className="my-6 border-t border-border" />

      <button
        onClick={() => setAppearanceSetting("chatColor", DEFAULT_COLOR)}
        className="text-sm text-primary hover:underline"
      >
        Reset all chat colors
      </button>
    </div>
  );
}
