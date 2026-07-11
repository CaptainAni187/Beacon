"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  className?: string;
}

/** Square tick-box matching Signal's settings checkboxes (not a pill/switch toggle). */
export function Checkbox({ checked, onChange, label, description, className }: CheckboxProps) {
  return (
    <label className={cn("flex items-start gap-3 py-2 text-sm", className)}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[4px] border transition-colors",
          checked ? "border-primary bg-primary" : "border-muted-foreground bg-background"
        )}
      >
        {checked && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
      </button>
      <span>
        {label}
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </span>
    </label>
  );
}
