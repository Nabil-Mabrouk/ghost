"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { CRITICAL_THRESHOLD, type LogEntry } from "@/lib/db";

function DriftBar({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5" title={`drift ${score}/10`}>
      {Array.from({ length: 10 }, (_, i) => (
        <span
          key={i}
          className={`h-2 w-3 ${
            i < score
              ? score >= CRITICAL_THRESHOLD
                ? "bg-critical"
                : "bg-accent"
              : "bg-nominal/40"
          }`}
        />
      ))}
    </div>
  );
}

export default function InsightCard({ entry }: { entry: LogEntry }) {
  const [thumb, setThumb] = useState<string | null>(null);
  const score = entry.drift_score ?? 0;
  const critical = score >= CRITICAL_THRESHOLD;
  const nominal = score <= 2;

  useEffect(() => {
    const url = URL.createObjectURL(entry.image);
    setThumb(url);
    return () => URL.revokeObjectURL(url);
  }, [entry.image]);

  return (
    <article
      className={`bg-card border p-3 space-y-2 ${
        critical
          ? "border-critical shadow-[0_0_12px_rgba(255,59,48,0.25)]"
          : nominal
            ? "border-nominal/40 opacity-60"
            : "border-nominal/60"
      }`}
    >
      <header className="flex items-center gap-2">
        <span className={`text-sm font-bold tracking-widest ${critical ? "text-critical" : "text-accent"}`}>
          {entry.point_id}
        </span>
        {critical && (
          <span className="flex items-center gap-1 text-[9px] tracking-widest bg-critical text-bg px-1.5 py-0.5 font-bold">
            <AlertTriangle size={10} /> CRITICAL SKILL UPDATE
          </span>
        )}
        {entry.drift_source === "heuristic" && (
          <span className="text-[9px] tracking-widest border border-nominal text-nominal px-1.5 py-0.5">
            HEURISTIC
          </span>
        )}
        <span className="ml-auto text-[9px] text-nominal tracking-widest">
          {new Date(entry.timestamp).toLocaleString()}
        </span>
      </header>

      <div className="flex gap-3">
        {thumb && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={`${entry.point_id} observation`}
            className="w-24 h-18 object-cover border border-nominal/40 shrink-0"
          />
        )}
        <div className="space-y-1.5 min-w-0">
          <DriftBar score={score} />
          <p className="text-[11px] leading-relaxed">{entry.reasoning}</p>
        </div>
      </div>

      {entry.voice_transcript && (
        <p className="text-[10px] text-nominal border-l-2 border-nominal/40 pl-2">
          VOICE LOG: “{entry.voice_transcript}”
        </p>
      )}

      {entry.focus_for_tomorrow && (
        <p
          className={`flex items-start gap-1 text-[11px] font-bold tracking-wide ${
            critical ? "text-critical" : "text-accent"
          }`}
        >
          <ChevronRight size={13} className="shrink-0 mt-px" />
          NEXT PASS: {entry.focus_for_tomorrow}
        </p>
      )}
    </article>
  );
}
