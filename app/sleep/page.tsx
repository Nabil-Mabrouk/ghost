"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MoonStar, Sunrise } from "lucide-react";
import { getBrain } from "@/lib/brain/client";
import {
  commitInsight,
  countUnanalysed,
  getContext,
  getUnanalysed,
} from "@/lib/db";
import { vibrate } from "@/lib/fx";

type Phase = "idle" | "running" | "done";

export default function SleepPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [lines, setLines] = useState<string[]>([]);
  const [pending, setPending] = useState(0);
  const [processed, setProcessed] = useState(0);
  const abortRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    countUnanalysed().then(setPending);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  const log = (line: string) =>
    setLines((prev) => [...prev, `> ${line}`]);

  async function engage() {
    if (phase === "running") return;
    abortRef.current = false;
    setPhase("running");
    setLines([]);
    setProcessed(0);
    const brain = getBrain();

    log("MAINTENANCE SLEEP ENGAGED — EXTERNAL POWER ASSUMED");
    const logs = await getUnanalysed();
    if (logs.length === 0) {
      log("NOTHING TO CONSOLIDATE — MEMORY IS CURRENT");
      setPhase("done");
      return;
    }
    log(`${logs.length} OBSERVATION(S) QUEUED FOR CONSOLIDATION`);
    log("WAKING GEMMA 4 E2B …");
    try {
      await brain.ensureGemma();
      log("MODEL RESIDENT — BEGINNING NIGHT PASS");
    } catch {
      log("MODEL LOAD FAILED — CHECK /DEV OR RETRY");
      setPhase("done");
      return;
    }

    let done = 0;
    for (const entry of logs) {
      if (abortRef.current) {
        log("WAKE SIGNAL RECEIVED — PASS SUSPENDED (progress kept)");
        break;
      }
      const t0 = Date.now();
      log(`── ${entry.point_id} @ ${new Date(entry.timestamp).toLocaleTimeString()} ──`);
      try {
        log(`CAPTIONING ${entry.point_id} …`);
        const caption = await brain.caption(entry.image);
        log(`VISION: ${caption.slice(0, 120)}${caption.length > 120 ? "…" : ""}`);

        const ctx = await getContext(entry.point_id);
        log(
          ctx
            ? `RECALL: baseline from ${new Date(ctx.updated_at).toLocaleDateString()}`
            : "NO BASELINE — REGISTERING AS DAY-0 MEMORY",
        );

        const result = await brain.analyse({
          point_id: entry.point_id,
          historical: ctx?.last_caption ?? null,
          current: caption,
          note: entry.voice_transcript,
        });
        await commitInsight(entry.id!, caption, result);
        done += 1;
        setProcessed(done);
        const secs = ((Date.now() - t0) / 1000).toFixed(1);
        const tag =
          result.drift_score >= 7
            ? "⚠ CRITICAL"
            : result.drift_score <= 2
              ? "NOMINAL"
              : "WATCH";
        log(`DRIFT ${result.drift_score}/10 — ${tag} (${secs}s, ${result.drift_source})`);
      } catch (err) {
        log(
          `FAULT ON ${entry.point_id}: ${err instanceof Error ? err.message : err} — SKIPPED, WILL RETRY NEXT SLEEP`,
        );
      }
    }

    log(`CONSOLIDATION COMPLETE — ${done} INSIGHT(S) COMMITTED`);
    vibrate(200);
    setPending(await countUnanalysed());
    setPhase("done");
  }

  function disengage() {
    abortRef.current = true;
  }

  return (
    <div className="p-3 max-w-lg mx-auto space-y-4">
      {/* Toggle */}
      <div className="bg-card border border-nominal/60 p-4 flex items-center justify-between">
        <div>
          <p className="text-xs tracking-widest uppercase">
            Engage Maintenance Sleep
          </p>
          <p className="text-[10px] text-nominal tracking-widest mt-1 uppercase">
            {pending} unprocessed · plug into power
          </p>
        </div>
        <button
          onClick={phase === "running" ? disengage : engage}
          aria-pressed={phase === "running"}
          className={`relative w-16 h-8 border transition-colors ${
            phase === "running"
              ? "bg-accent border-accent"
              : "bg-bg border-nominal"
          }`}
        >
          <span
            className={`absolute top-0.5 w-6 h-6 transition-all ${
              phase === "running"
                ? "right-0.5 bg-bg"
                : "left-0.5 bg-nominal"
            }`}
          />
        </button>
      </div>

      {/* Consolidation visualizer */}
      <div className="bg-card border border-nominal/60">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-nominal/40 text-[10px] tracking-widest text-nominal uppercase">
          <MoonStar size={12} className={phase === "running" ? "text-accent" : ""} />
          Night-pass console
          {phase === "running" && (
            <span className="ml-auto text-accent pulse-bar">CONSOLIDATING…</span>
          )}
          {phase === "running" && processed > 0 && (
            <span className="text-accent">{processed} done</span>
          )}
        </div>
        <div
          ref={scrollRef}
          className="h-72 overflow-y-auto p-3 text-[11px] leading-relaxed text-accent/90 whitespace-pre-wrap"
        >
          {lines.length === 0 ? (
            <span className="text-nominal">
              &gt; system idle. engage sleep to begin memory consolidation.
            </span>
          ) : (
            lines.map((l, i) => <div key={i}>{l}</div>)
          )}
          {phase === "running" && <span className="terminal-cursor" />}
        </div>
      </div>

      {phase === "done" && (
        <Link
          href="/briefing"
          className="flex items-center justify-center gap-2 bg-accent text-bg font-bold py-3 text-sm tracking-widest"
        >
          <Sunrise size={16} /> OPEN MORNING BRIEFING
        </Link>
      )}
    </div>
  );
}
