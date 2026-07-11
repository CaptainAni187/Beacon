"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, Video } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { getCallLinkByRoomKey, type CallLink } from "@/lib/calls";
import { useCallStore } from "@/store/callStore";

interface CallJoinPageProps {
  params: { roomKey: string };
}

/** Landing screen for a shared call-link URL (e.g. /call/abc123). */
export default function CallJoinPage({ params }: CallJoinPageProps) {
  const router = useRouter();
  const [link, setLink] = useState<CallLink | null>(null);
  const [error, setError] = useState<string | null>(null);
  const joinRoom = useCallStore((state) => state.joinRoom);
  const phase = useCallStore((state) => state.phase);

  useEffect(() => {
    getCallLinkByRoomKey(params.roomKey)
      .then(setLink)
      .catch(() => setError("This call link doesn't exist or has expired."));
  }, [params.roomKey]);

  if (phase !== "idle") {
    // The CallManager overlay is now showing the active call UI.
    return null;
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!error && !link && <p className="text-sm text-muted-foreground">Loading call…</p>}
      {link && (
        <>
          <Avatar src={null} name={link.name || "Beacon Call"} size="xl" />
          <div>
            <p className="text-lg font-semibold">{link.name || "Beacon Call"}</p>
            <p className="text-sm text-muted-foreground">Started by {link.createdBy.displayName}</p>
          </div>
          {link.requiresAdminApproval && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <UserCheck className="h-3.5 w-3.5" /> The host may need to let you in
            </p>
          )}
          <div className="mt-2 flex gap-3">
            <button
              onClick={() => router.push("/")}
              className="rounded-full bg-secondary px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Cancel
            </button>
            <button
              onClick={() => void joinRoom({ roomKey: link.roomKey, type: "video", title: link.name || "Call" })}
              className="flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Video className="h-4 w-4" /> Join call
            </button>
          </div>
        </>
      )}
    </div>
  );
}
