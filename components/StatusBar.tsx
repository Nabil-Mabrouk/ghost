"use client";

import { useEffect, useState } from "react";
import { useAppStatus } from "@/lib/status";

function modelLabel(state: string, pct: number): string {
  switch (state) {
    case "ready":
      return "READY";
    case "loading":
      return `LOADING ${pct}%`;
    case "error":
      return "FAULT";
    default:
      return "COLD";
  }
}

export default function StatusBar() {
  const { engine, gemma, gemmaPct } = useAppStatus();
  // Offline is the *good* state for this app: green dot when disconnected.
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return (
    <header className="fixed top-0 inset-x-0 z-40 h-9 bg-card border-b border-nominal/60 flex items-center gap-3 px-3 text-[10px] uppercase tracking-widest select-none">
      <span className="text-accent font-bold">GHOST-WALK</span>
      <span className="text-nominal">|</span>
      <span>
        ENGINE: <span className="text-accent">{engine.toUpperCase()}</span>
      </span>
      <span className="text-nominal">|</span>
      <span>
        MODEL:{" "}
        <span className={gemma === "ready" ? "text-ok" : "text-accent"}>
          {modelLabel(gemma, gemmaPct)}
        </span>
      </span>
      <span className="ml-auto flex items-center gap-2">
        <span>SYNC: LOCAL_ONLY</span>
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            online ? "bg-accent" : "bg-ok"
          }`}
          title={online ? "Uplink detected (unused)" : "Offline — nominal"}
        />
      </span>
    </header>
  );
}
