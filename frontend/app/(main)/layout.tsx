"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { ConversationList } from "@/components/conversation-list/ConversationList";
import { ToastContainer } from "@/components/shared/Toast";
import { IconRail } from "@/components/layout/IconRail";
import { useAuthStore } from "@/store/authStore";
import { getAccessToken } from "@/lib/auth";
import { socket } from "@/lib/socket";
import { RealtimeListener } from "@/components/shared/RealtimeListener";
import { CallManager } from "@/components/calls/CallManager";
import { cn } from "@/lib/utils";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, restoreSession } = useAuthStore();

  const isChatRoute = pathname?.startsWith("/chat/") ?? false;
  const isFullBleedRoute =
    (pathname?.startsWith("/settings") ||
      pathname?.startsWith("/calls") ||
      pathname?.startsWith("/stories") ||
      pathname?.startsWith("/call/")) ??
    false;
  const hideConversationAside = isChatRoute || isFullBleedRoute;

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) {
      socket.disconnect();
      return;
    }
    socket.connect(getAccessToken() ?? undefined);
    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated]);

  if (isLoading || !isAuthenticated) {
    return <div className="flex h-screen items-center justify-center bg-background text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      <IconRail />
      <div className="flex flex-1 overflow-hidden">
        <aside
          className={cn(
            "w-full flex-shrink-0 flex-col bg-sidebar",
            isFullBleedRoute
              ? "hidden"
              : isChatRoute
                ? "hidden md:flex md:w-[360px]"
                : "flex md:w-[360px]"
          )}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
            <span className="text-lg font-bold text-primary">Beacon</span>
            <Link
              href="/settings"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Settings
            </Link>
          </div>
          <ConversationList />
        </aside>
        <main
          className={cn(
            "flex-1 flex-col overflow-hidden bg-background",
            hideConversationAside ? "flex" : "hidden md:flex"
          )}
        >
          {children}
        </main>
      </div>
      <ToastContainer />
      <RealtimeListener />
      <CallManager />
    </div>
  );
}
