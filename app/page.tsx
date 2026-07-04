"use client";

import Link from "next/link";
import { useAppStatus } from "@/lib/status";
import { ChevronRight } from "lucide-react";

export default function BootPage() {
  const { engine, gemma } = useAppStatus();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-5.75rem)] gap-8 px-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-[0.3em] text-accent">
          GHOST-WALK
        </h1>
        <p className="mt-2 text-[11px] tracking-widest text-nominal uppercase">
          Temporal drift reasoning · On-device · Zero uplink
        </p>
      </div>

      <div className="w-full max-w-sm bg-card border border-nominal/60 p-4 text-xs space-y-2">
        <Row label="INFERENCE ENGINE" value={engine.toUpperCase()} ok={engine === "webgpu"} />
        <Row label="GEMMA 4 E2B" value={gemma.toUpperCase()} ok={gemma === "ready"} />
        <Row label="DATA RESIDENCY" value="THIS DEVICE" ok />
      </div>

      {/* Model preload (INITIALIZE SYSTEM) is wired in the brain block. */}
      <Link
        href="/walk"
        className="flex items-center gap-2 bg-accent text-bg font-bold px-8 py-3 text-sm tracking-widest hover:opacity-90"
      >
        BEGIN WALK <ChevronRight size={16} />
      </Link>
    </div>
  );
}

function Row({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex justify-between uppercase tracking-widest">
      <span className="text-nominal">{label}</span>
      <span className={ok ? "text-ok" : "text-accent"}>{value}</span>
    </div>
  );
}
