"use client";

import { useEffect } from "react";
import StatusBar from "./StatusBar";
import TabNav from "./TabNav";
import { setStatus } from "@/lib/status";

export default function AppChrome({
  children,
}: {
  children: React.ReactNode;
}) {
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

  return (
    <>
      <StatusBar />
      <main className="pt-9 pb-14 min-h-dvh">{children}</main>
      <TabNav />
      <div className="scanlines" aria-hidden />
    </>
  );
}
