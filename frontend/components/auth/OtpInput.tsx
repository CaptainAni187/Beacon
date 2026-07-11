"use client";

import { cn } from "@/lib/utils";

export interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * OTP (One-Time Password) input component.
 * Renders individual digit boxes for verification codes.
 * TODO: Implement auto-focus, paste support, and backspace navigation.
 */
export function OtpInput({
  length = 6,
  value,
  onChange,
  disabled = false,
  className,
}: OtpInputProps) {
  const digits = value.padEnd(length, " ").split("").slice(0, length);

  const handleChange = (index: number, digit: string) => {
    if (!/^\d?$/.test(digit)) return;
    const chars = value.split("");
    chars[index] = digit;
    onChange(chars.join("").slice(0, length));
  };

  return (
    <div className={cn("flex gap-2", className)}>
      {digits.map((digit, index) => (
        <input
          key={index}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit.trim()}
          disabled={disabled}
          onChange={(e) => handleChange(index, e.target.value)}
          className={cn(
            "h-12 w-10 rounded-md border border-border bg-background text-center text-lg font-semibold",
            "focus:outline-none focus:ring-2 focus:ring-ring",
            disabled && "opacity-50"
          )}
          aria-label={`Digit ${index + 1}`}
        />
      ))}
    </div>
  );
}
