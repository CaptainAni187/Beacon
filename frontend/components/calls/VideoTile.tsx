"use client";

import { useEffect, useRef } from "react";
import { Avatar } from "@/components/shared/Avatar";
import { cn } from "@/lib/utils";

export interface VideoTileProps {
  stream: MediaStream | null;
  name: string;
  muted?: boolean;
  mirrored?: boolean;
  hasVideo: boolean;
  className?: string;
}

/** Renders one participant's media: a live <video> tile if video is on, else an avatar. */
export function VideoTile({ stream, name, muted, mirrored, hasVideo, className }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-lg bg-secondary",
        className
      )}
    >
      {hasVideo && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className={cn("h-full w-full object-cover", mirrored && "-scale-x-100")}
        />
      ) : (
        <>
          <Avatar src={null} name={name} size="xl" />
          {stream && (
            <audio
              ref={(el) => {
                if (el) el.srcObject = stream;
              }}
              autoPlay
              muted={muted}
            />
          )}
        </>
      )}
      <span className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-0.5 text-xs text-white">
        {name}
      </span>
    </div>
  );
}
