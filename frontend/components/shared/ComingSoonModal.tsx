"use client";

import { Sparkles } from "lucide-react";
import { ModalShell } from "@/components/shared/ModalShell";

export interface ComingSoonModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: string;
}

/** Generic placeholder modal for not-yet-implemented features. */
export function ComingSoonModal({ isOpen, onClose, feature }: ComingSoonModalProps) {
  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Coming Soon">
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <Sparkles className="h-8 w-8 text-primary" />
        <p className="text-sm text-muted-foreground">
          {feature} isn&apos;t available yet, but it&apos;s on the roadmap.
        </p>
        <button
          onClick={onClose}
          className="mt-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
        >
          Got it
        </button>
      </div>
    </ModalShell>
  );
}
