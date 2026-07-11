"use client";

import { useRouter } from "next/navigation";
import { AtSign, ChevronRight, Pencil, User as UserIcon } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { useAuthStore } from "@/store/authStore";

export default function SettingsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  if (!user) return null;

  return (
    <div className="mx-auto max-w-xl py-10">
      <h2 className="mb-8 text-center text-lg font-semibold">Profile</h2>

      <div className="flex flex-col items-center">
        <Avatar src={user.avatarUrl} name={user.displayName} size="xl" />
        <button
          onClick={() => router.push("/settings/profile/avatar")}
          className="mt-3 rounded-full bg-secondary px-3 py-1 text-xs font-medium hover:bg-accent"
        >
          Edit photo
        </button>
      </div>

      <div className="mt-8 space-y-1">
        <button
          onClick={() => router.push("/settings/profile/name")}
          className="flex w-full items-center gap-3 rounded-md px-2 py-3 text-left hover:bg-secondary"
        >
          <UserIcon className="h-5 w-5 text-muted-foreground" />
          <span className="flex-1 text-sm">{user.displayName}</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>

        <button
          onClick={() => router.push("/settings/profile/about")}
          className="flex w-full items-center gap-3 rounded-md px-2 py-3 text-left hover:bg-secondary"
        >
          <Pencil className="h-5 w-5 text-muted-foreground" />
          <span className="flex-1 text-sm">{user.bio || "About"}</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <p className="mt-3 px-2 text-xs text-muted-foreground">
        Your profile and changes to it will be visible to people you message, contacts and groups.
      </p>

      <div className="my-6 border-t border-border" />

      <button
        onClick={() => router.push("/settings/profile/username")}
        className="flex w-full items-center gap-3 rounded-md px-2 py-3 text-left hover:bg-secondary"
      >
        <AtSign className="h-5 w-5 text-muted-foreground" />
        <span className="flex-1 text-sm">Username</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
      <p className="mt-1 px-2 text-xs text-muted-foreground">
        People can now message you using your optional username so you don&apos;t have to give out
        your phone number.
      </p>
    </div>
  );
}
