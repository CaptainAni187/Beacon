"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const COLORS = ["#3a76f0", "#4bb543", "#e07b39", "#a259d9", "#d94f70", "#2bb3a3", "#c9a227"];

export interface TextStoryComposerProps {
  onClose: () => void;
  onSubmit: (text: string, backgroundColor: string) => Promise<void>;
}

export function TextStoryComposer({ onClose, onSubmit }: TextStoryComposerProps) {
  const [text, setText] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [isPosting, setIsPosting] = useState(false);

  const handlePost = async () => {
    if (!text.trim()) return;
    setIsPosting(true);
    try {
      await onSubmit(text.trim(), color);
      onClose();
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70">
      <button onClick={onClose} className="absolute right-6 top-6 text-white" aria-label="Close">
        <X className="h-6 w-6" />
      </button>

      <div
        className="flex h-[420px] w-80 items-center justify-center rounded-2xl p-8 text-center transition-colors"
        style={{ backgroundColor: color }}
      >
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Start typing…"
          maxLength={700}
          className="h-full w-full resize-none bg-transparent text-center text-2xl font-semibold text-white placeholder:text-white/60 focus:outline-none"
        />
      </div>

      <div className="mt-6 flex gap-2">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={cn("h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-black/70", c === color ? "ring-white" : "ring-transparent")}
            style={{ backgroundColor: c }}
            aria-label={`Background ${c}`}
          />
        ))}
      </div>

      <button
        onClick={handlePost}
        disabled={!text.trim() || isPosting}
        className="mt-6 rounded-full bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {isPosting ? "Posting…" : "Share to My Story"}
      </button>
    </div>
  );
}
