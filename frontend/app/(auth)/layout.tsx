import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In — Beacon",
};

/**
 * Auth route group layout.
 * Centered card layout for login and registration pages.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
