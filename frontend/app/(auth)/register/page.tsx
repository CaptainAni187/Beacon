"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { RegisterPayload } from "@/types/user";
import { OtpInput } from "@/components/auth/OtpInput";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, verifyOtp, pendingOtpEmail, isLoading, error } = useAuthStore();
  const [otp, setOtp] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterPayload>();

  const onSubmit = async (data: RegisterPayload) => {
    await registerUser(data);
  };

  const onVerify = async () => {
    if (!pendingOtpEmail) return;
    await verifyOtp(pendingOtpEmail, otp);
    router.replace("/");
  };

  return (
    <div className="rounded-lg border border-border bg-card p-8 shadow-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-foreground">Create account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Join Beacon and start messaging
        </p>
      </div>

      {!pendingOtpEmail ? (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="displayName" className="mb-1 block text-sm font-medium">
            Display Name
          </label>
          <input
            id="displayName"
            type="text"
            {...register("displayName", { required: "Display name is required" })}
            className={cn(
              "w-full rounded-md border border-border bg-background px-3 py-2 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-ring"
            )}
            placeholder="Jane Doe"
          />
          {errors.displayName && (
            <p className="mt-1 text-xs text-destructive">
              {errors.displayName.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="username" className="mb-1 block text-sm font-medium">
            Username
          </label>
          <input
            id="username"
            type="text"
            {...register("username", { required: "Username is required" })}
            className={cn(
              "w-full rounded-md border border-border bg-background px-3 py-2 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-ring"
            )}
            placeholder="janedoe"
          />
          {errors.username && (
            <p className="mt-1 text-xs text-destructive">
              {errors.username.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            {...register("email", { required: "Email is required" })}
            className={cn(
              "w-full rounded-md border border-border bg-background px-3 py-2 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-ring"
            )}
            placeholder="you@example.com"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            {...register("password", {
              required: "Password is required",
              minLength: { value: 8, message: "Minimum 8 characters" },
            })}
            className={cn(
              "w-full rounded-md border border-border bg-background px-3 py-2 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-ring"
            )}
            placeholder="••••••••"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
            "hover:bg-primary/90 disabled:opacity-50"
          )}
        >
          {isSubmitting ? "Creating account…" : "Create account"}
        </button>
      </form>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Verification code</label>
            <OtpInput value={otp} onChange={setOtp} disabled={isLoading} />
          </div>
          <p className="text-sm text-muted-foreground">
            Enter the mock OTP sent to {pendingOtpEmail}.
          </p>
          <button
            type="button"
            disabled={isLoading || otp.length !== 6}
            onClick={onVerify}
            className={cn(
              "w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
              "hover:bg-primary/90 disabled:opacity-50"
            )}
          >
            {isLoading ? "Verifying..." : "Verify OTP"}
          </button>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
