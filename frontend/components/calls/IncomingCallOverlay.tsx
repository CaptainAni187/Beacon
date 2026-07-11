"use client";

import { Phone, PhoneOff, Video } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { useCallStore } from "@/store/callStore";

export function IncomingCallOverlay() {
  const { incomingCall, acceptIncoming, declineIncoming } = useCallStore();
  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="flex w-80 flex-col items-center gap-4 rounded-2xl bg-background p-8 shadow-2xl">
        <Avatar src={null} name={incomingCall.fromName} size="xl" />
        <div className="text-center">
          <p className="text-lg font-semibold">{incomingCall.fromName}</p>
          <p className="text-sm text-muted-foreground">
            Incoming {incomingCall.type === "video" ? "video" : "voice"} call…
          </p>
        </div>
        <div className="mt-4 flex items-center gap-6">
          <button
            onClick={declineIncoming}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
            aria-label="Decline call"
          >
            <PhoneOff className="h-6 w-6" />
          </button>
          <button
            onClick={() => void acceptIncoming()}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white hover:bg-green-600"
            aria-label="Accept call"
          >
            {incomingCall.type === "video" ? <Video className="h-6 w-6" /> : <Phone className="h-6 w-6" />}
          </button>
        </div>
      </div>
    </div>
  );
}
