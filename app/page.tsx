"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, DownloadCloud } from "lucide-react";
import { getBrain } from "@/lib/brain/client";
import { useAppStatus } from "@/lib/status";

export default function BootPage() {
  const { engine, gemma, gemmaPct, whisper, whisperPct } = useAppStatus();
  const [initError, setInitError] = useState<string | null>(null);
  const busy = gemma === "loading" || whisper === "loading";
  const ready = gemma === "ready" && whisper === "ready";

  async function initialize() {
    setInitError(null);
    try {
      // Sequential: whisper first (small, fast feedback), then gemma.
      await getBrain().ensureWhisper();
      await getBrain().ensureGemma();
    } catch (err) {
      setInitError(
        `INIT FAULT: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

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
        <Row
          label="INFERENCE ENGINE"
          value={engine.toUpperCase()}
          ok={engine === "webgpu"}
        />
        <Row
          label="GEMMA 4 E2B (LLM)"
          value={gemma === "loading" ? `LOADING ${gemmaPct}%` : gemma.toUpperCase()}
          ok={gemma === "ready"}
        />
        <Row
          label="WHISPER TINY (STT)"
          value={
            whisper === "loading" ? `LOADING ${whisperPct}%` : whisper.toUpperCase()
          }
          ok={whisper === "ready"}
        />
        <Row label="DATA RESIDENCY" value="THIS DEVICE" ok />
      </div>

      {initError && (
        <p className="text-[10px] tracking-widest text-critical max-w-sm text-center">
          {initError}
        </p>
      )}

      <div className="flex flex-col items-center gap-3">
        {!ready && (
          <button
            onClick={initialize}
            disabled={busy}
            className="flex items-center gap-2 border border-accent text-accent px-8 py-3 text-sm tracking-widest hover:bg-accent hover:text-bg disabled:opacity-50"
          >
            <DownloadCloud size={16} />
            {busy ? "PROVISIONING…" : "INITIALIZE SYSTEM"}
          </button>
        )}
        <Link
          href="/walk"
          className="flex items-center gap-2 bg-accent text-bg font-bold px-8 py-3 text-sm tracking-widest hover:opacity-90"
        >
          BEGIN WALK <ChevronRight size={16} />
        </Link>
        <p className="text-[9px] tracking-widest text-nominal uppercase max-w-xs text-center">
          Initialize once while connected — after that, everything runs in
          airplane mode.
        </p>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok?: boolean;
}) {
  return (
    <div className="flex justify-between uppercase tracking-widest">
      <span className="text-nominal">{label}</span>
      <span className={ok ? "text-ok" : "text-accent"}>{value}</span>
    </div>
  );
}
