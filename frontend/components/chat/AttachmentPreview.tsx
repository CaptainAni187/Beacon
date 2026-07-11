"use client";

import { X, FileIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AttachmentPreviewProps {
  filename: string;
  mimeType: string;
  size: number;
  onRemove?: () => void;
  className?: string;
}

/**
 * Preview chip for a pending file attachment before sending.
 * TODO: Add image thumbnail preview for image mime types.
 */
export function AttachmentPreview({
  filename,
  mimeType,
  size,
  onRemove,
  className,
}: AttachmentPreviewProps) {
  const sizeLabel =
    size < 1024
      ? `${size} B`
      : size < 1024 * 1024
        ? `${(size / 1024).toFixed(1)} KB`
        : `${(size / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-sm",
        className
      )}
    >
      <FileIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{filename}</p>
        <p className="text-xs text-muted-foreground">
          {mimeType} · {sizeLabel}
        </p>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="rounded p-1 text-muted-foreground hover:text-foreground"
          aria-label="Remove attachment"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
