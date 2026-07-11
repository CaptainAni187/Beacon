import { MessageCircle } from "lucide-react";

/**
 * Main inbox page — shown when no conversation is selected.
 */
export default function InboxPage() {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center bg-background text-center">
      <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-dashed border-primary/60">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary">
          <MessageCircle className="h-10 w-10 text-primary-foreground" fill="currentColor" />
        </div>
      </div>
      <h2 className="mt-6 text-xl font-semibold text-foreground">Welcome to Beacon</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose a conversation from the sidebar or start a new chat.
      </p>
      <p className="absolute bottom-6 text-xs text-muted-foreground">
        Beacon is a Signal-inspired messaging demo
      </p>
    </div>
  );
}
