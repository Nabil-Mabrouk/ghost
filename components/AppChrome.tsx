"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import StatusBar from "./StatusBar";
import TabNav from "./TabNav";
import { setStatus } from "@/lib/status";

export default function AppChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  // The landing page is marketing, not the instrument — no tactical chrome.
  const isLanding = usePathname() === "/";

  useEffect(() => {
    // Engine detection (SPEC.md §2.3) — actual adapter init happens in the worker.
    setStatus({ engine: "gpu" in navigator ? "webgpu" : "wasm" });
    // Ask the browser not to evict our IndexedDB (photos + model cache matter).
    navigator.storage?.persist?.().catch(() => {});
    // Offline app shell — production builds only (SW fights the dev server).
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  if (isLanding) {
    return (
      <>
        <main className="min-h-dvh">{children}</main>
        <div className="scanlines" aria-hidden />
      </>
    );
  }

  return (
    <>
      <StatusBar />
      <main className="pt-9 pb-14 min-h-dvh">{children}</main>
      <TabNav />
      <div className="scanlines" aria-hidden />
    </>
  );
}
