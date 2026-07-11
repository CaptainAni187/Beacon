"use client";

import { useEffect } from "react";
import { useUIStore } from "@/store/uiStore";

/** Applies persisted theme/privacy/notification prefs on first load. */
export function ThemeInit() {
  const hydrate = useUIStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return null;
}
