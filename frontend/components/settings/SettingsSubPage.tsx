"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export interface SettingsSubPageProps {
  title: string;
  children: React.ReactNode;
}

/** Shared drill-down layout for settings sub-pages: back chevron + centered title. */
export function SettingsSubPage({ title, children }: SettingsSubPageProps) {
  const router = useRouter();

  return (
    <div className="relative mx-auto max-w-xl py-10">
      <button
        onClick={() => router.back()}
        className="absolute left-0 top-10 rounded-md p-1.5 text-muted-foreground hover:text-foreground"
        aria-label="Back"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <h2 className="mb-8 text-center text-lg font-semibold">{title}</h2>
      {children}
    </div>
  );
}
