"use client";

import { useEffect, useState } from "react";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import { useCallStore } from "@/store/callStore";
import { VideoTile } from "./VideoTile";
import { cn } from "@/lib/utils";

function useElapsedSeconds(active: boolean): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) {
      setSeconds(0);
      return;
    }
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [active]);
  return seconds;
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Full-screen overlay for an outgoing/connecting/active call. */
export function ActiveCallOverlay() {
  const { phase, type, title, localStream, isMuted, isCameraOff, peers, toggleMute, toggleCamera, endCall } =
    useCallStore();
  const elapsed = useElapsedSeconds(phase === "active");
  const peerList = Object.entries(peers);

  const statusLabel =
    phase === "outgoing" ? "Calling…" : phase === "connecting" ? "Connecting…" : formatDuration(elapsed);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-6 py-4 text-white">
        <div>
          <p className="text-lg font-semibold">{title || "Call"}</p>
          <p className="text-sm text-white/70">{statusLabel}</p>
        </div>
      </div>

      <div
        className={cn(
          "flex-1 grid gap-2 p-4",
          peerList.length <= 1 ? "grid-cols-1" : peerList.length <= 4 ? "grid-cols-2" : "grid-cols-3"
        )}
      >
        {peerList.length === 0 && (
          <div className="flex items-center justify-center text-white/60">
            Waiting for the other side to join…
          </div>
        )}
        {peerList.map(([userId, peer]) => (
          <VideoTile
            key={userId}
            stream={peer.stream}
            name={peer.displayName}
            hasVideo={type === "video"}
            className="min-h-[200px]"
          />
        ))}
      </div>

      {type === "video" && (
        <div className="absolute bottom-24 right-6 h-32 w-24 overflow-hidden rounded-lg border border-white/20 shadow-lg">
          <VideoTile stream={localStream} name="You" muted mirrored hasVideo className="h-full w-full" />
        </div>
      )}

      <div className="flex items-center justify-center gap-6 pb-10 pt-4">
        <button
          onClick={toggleMute}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>
        {type === "video" && (
          <button
            onClick={toggleCamera}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
            aria-label={isCameraOff ? "Turn camera on" : "Turn camera off"}
          >
            {isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </button>
        )}
        <button
          onClick={endCall}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
          aria-label="End call"
        >
          <PhoneOff className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
