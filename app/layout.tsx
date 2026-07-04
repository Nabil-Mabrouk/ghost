import type { Metadata, Viewport } from "next";
// Self-hosted font — no network fetch at runtime (offline requirement).
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/700.css";
import "./globals.css";
import AppChrome from "@/components/AppChrome";

export const metadata: Metadata = {
  title: "GHOST-WALK",
  description:
    "Offline-first industrial agent for temporal drift reasoning. Gemma 4 on-device.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0d0d0d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full antialiased">
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
