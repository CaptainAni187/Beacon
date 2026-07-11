"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, MessageCircle, Phone, Settings, BookImage } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/uiStore";

/**
 * Signal-style vertical icon rail: chats / calls / stories navigation
 * plus a hamburger menu up top and settings gear pinned to the bottom.
 */
export function IconRail() {
  const pathname = usePathname();
  const storiesEnabled = useUIStore((state) => state.privacy.storiesEnabled);
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const isChats = (pathname === "/" || pathname?.startsWith("/chat/")) ?? false;
  const isCalls = pathname?.startsWith("/calls") ?? false;
  const isStories = pathname?.startsWith("/stories") ?? false;
  const isSettings = pathname?.startsWith("/settings") ?? false;

  if (!sidebarOpen) {
    return (
      <button
        onClick={toggleSidebar}
        className="absolute left-2 top-2 z-20 hidden rounded-md p-2.5 text-foreground/80 hover:bg-secondary md:flex"
        aria-label="Show sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>
    );
  }

  return (
    <nav className="hidden w-[72px] flex-shrink-0 flex-col items-center justify-between bg-rail py-3 md:flex">
      <div className="flex w-full flex-col items-center gap-2">
        <button
          onClick={toggleSidebar}
          className="rounded-md p-2.5 text-foreground/80 hover:bg-secondary"
          aria-label="Hide sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link
          href="/"
          className={cn(
            "rounded-lg p-2.5 transition-colors",
            isChats ? "bg-secondary text-foreground" : "text-foreground/60 hover:bg-secondary"
          )}
          aria-label="Chats"
        >
          <MessageCircle className="h-5 w-5" />
        </Link>

        <Link
          href="/calls"
          className={cn(
            "rounded-lg p-2.5 transition-colors",
            isCalls ? "bg-secondary text-foreground" : "text-foreground/60 hover:bg-secondary"
          )}
          aria-label="Calls"
        >
          <Phone className="h-5 w-5" />
        </Link>

        {storiesEnabled && (
          <Link
            href="/stories"
            className={cn(
              "rounded-lg p-2.5 transition-colors",
              isStories ? "bg-secondary text-foreground" : "text-foreground/60 hover:bg-secondary"
            )}
            aria-label="Stories"
          >
            <BookImage className="h-5 w-5" />
          </Link>
        )}
      </div>

      <Link
        href="/settings"
        className={cn(
          "rounded-lg p-2.5 transition-colors",
          isSettings ? "bg-secondary text-foreground" : "text-foreground/60 hover:bg-secondary"
        )}
        aria-label="Settings"
      >
        <Settings className="h-5 w-5" />
      </Link>
    </nav>
  );
}
