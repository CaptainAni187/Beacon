"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Clock,
  Cloud,
  Heart,
  MessageSquare,
  Phone,
  Settings as SettingsIcon,
  Shield,
  SunMoon,
} from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";

const settingsLinks = [
  { href: "/settings/general", label: "General", icon: SettingsIcon },
  { href: "/settings/appearance", label: "Appearance", icon: SunMoon },
  { href: "/settings/chats", label: "Chats", icon: MessageSquare },
  { href: "/settings/calls", label: "Calls", icon: Phone },
  { href: "/settings/notifications", label: "Notifications", icon: Bell },
  { href: "/settings/privacy", label: "Privacy", icon: Shield },
  { href: "/settings/data-usage", label: "Data usage", icon: Cloud },
  { href: "/settings/backups", label: "Backups", icon: Clock },
  { href: "/settings/donate", label: "Donate to Beacon", icon: Heart },
];

/**
 * Settings layout: Signal-style profile card + navigation list on the left,
 * with the active section's content on the right.
 */
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden bg-background">
      <aside className="flex w-[360px] flex-shrink-0 flex-col bg-sidebar p-4">
        <h1 className={cn("mb-4 px-1 text-xl font-bold", !sidebarOpen && "md:pl-10")}>Settings</h1>

        <Link
          href="/settings"
          className={cn(
            "mb-2 flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-secondary",
            pathname === "/settings" && "bg-secondary"
          )}
        >
          <Avatar src={user?.avatarUrl ?? null} name={user?.displayName ?? "?"} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user?.displayName}</p>
            <p className="truncate text-xs text-muted-foreground">@{user?.username}</p>
          </div>
        </Link>

        <nav className="space-y-0.5">
          {settingsLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-secondary",
                pathname === href && "bg-secondary font-medium"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
