"use client";

import { useEffect, useState } from "react";
import InsightCard from "@/components/InsightCard";
import { CRITICAL_THRESHOLD, getBriefing, type LogEntry } from "@/lib/db";

export default function BriefingPage() {
  const [entries, setEntries] = useState<LogEntry[] | null>(null);

  useEffect(() => {
    getBriefing().then(setEntries);
  }, []);

  if (entries === null) return null;

  const critical = entries.filter(
    (e) => (e.drift_score ?? 0) >= CRITICAL_THRESHOLD,
  ).length;
  const points = new Set(entries.map((e) => e.point_id)).size;

  return (
    <div className="p-3 max-w-lg mx-auto space-y-3">
      <header className="bg-card border border-nominal/60 p-3">
        <h1 className="text-sm tracking-[0.25em] text-accent">
          MORNING BRIEFING —{" "}
          {new Date()
            .toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
            .toUpperCase()}
        </h1>
        <p className="text-[10px] tracking-widest text-nominal mt-1 uppercase">
          {points} checkpoint(s) consolidated ·{" "}
          <span className={critical ? "text-critical" : ""}>
            {critical} critical
          </span>{" "}
          · {entries.length} insight(s)
        </p>
      </header>

      {entries.length === 0 ? (
        <p className="text-center text-[11px] tracking-widest text-nominal uppercase py-16">
          No consolidated memory.
          <br />
          Run a walk, then engage sleep.
        </p>
      ) : (
        entries.map((e) => <InsightCard key={e.id} entry={e} />)
      )}
    </div>
  );
}
