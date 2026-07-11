import type { Metadata } from "next";
import "./globals.css";
import { ThemeInit } from "@/components/shared/ThemeInit";

export const metadata: Metadata = {
  title: "Beacon — Messaging",
  description: "Enterprise-grade real-time messaging platform",
};

/**
 * Root layout wrapping all routes.
 * Provides global HTML structure and metadata.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeInit />
        {children}
      </body>
    </html>
  );
}
