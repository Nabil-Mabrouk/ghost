"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addLog,
  clearAll,
  db,
  seedContext,
  type LogEntry,
  type HistoricalContext,
} from "@/lib/db";

// Hidden operator panel (SPEC.md §1.5): demo seeding, DB inspection, flags.
// Not linked from the tab nav on purpose.
export default function DevPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [contexts, setContexts] = useState<HistoricalContext[]>([]);
  const [mock, setMock] = useState(false);
  const [msg, setMsg] = useState("");

  const refresh = useCallback(async () => {
    setLogs(await db.logs.toArray());
    setContexts(await db.historical_context.toArray());
    setMock(localStorage.getItem("gw-mock") === "1");
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const say = (m: string) => setMsg(`> ${m}`);

  async function writeDummy() {
    const blob = new Blob([new Uint8Array(2048).fill(7)], {
      type: "image/jpeg",
    });
    const id = await addLog({
      point_id: "PUMP-A",
      image: blob,
      voice_transcript: "Dev panel dummy log entry.",
    });
    say(`dummy log #${id} written (2048-byte blob)`);
    await refresh();
  }

  async function seedBaseline() {
    // Canned day-0 memory for the demo checkpoint. Real baseline photos are
    // seeded via the same path once demo props exist (Block 6).
    await seedContext({
      point_id: "PUMP-A",
      last_caption:
        "Centrifugal pump unit on a steel skid. Motor housing sits level and " +
        "aligned with the pump shaft. Mounting bolts seated, no visible " +
        "corrosion or leaks. Pressure gauge reads mid-range.",
      last_insight: "Baseline registered. All parameters nominal.",
      updated_at: Date.now() - 24 * 60 * 60 * 1000,
    });
    say("PUMP-A baseline seeded (backdated 24h)");
    await refresh();
  }

  async function wipe() {
    await clearAll();
    say("database cleared");
    await refresh();
  }

  function toggleMock() {
    const next = !mock;
    localStorage.setItem("gw-mock", next ? "1" : "0");
    setMock(next);
    say(`mock brain ${next ? "ENGAGED" : "disengaged"}`);
  }

  async function dump() {
    console.log("logs", await db.logs.toArray());
    console.log("historical_context", await db.historical_context.toArray());
    say("dumped to console");
  }

  return (
    <div className="p-4 space-y-4 text-xs">
      <h1 className="text-accent tracking-widest text-sm">/DEV — OPERATOR PANEL</h1>

      <div className="flex flex-wrap gap-2">
        <Btn onClick={writeDummy}>WRITE DUMMY LOG</Btn>
        <Btn onClick={seedBaseline}>SEED PUMP-A BASELINE</Btn>
        <Btn onClick={toggleMock}>
          MOCK BRAIN: {mock ? "ON" : "OFF"}
        </Btn>
        <Btn onClick={dump}>DUMP TO CONSOLE</Btn>
        <Btn onClick={wipe} danger>
          CLEAR DB
        </Btn>
      </div>

      {msg && <p className="text-accent">{msg}</p>}

      <section className="bg-card border border-nominal/60 p-3">
        <h2 className="text-nominal tracking-widest mb-2">
          LOGS ({logs.length})
        </h2>
        {logs.map((l) => (
          <div key={l.id} className="border-b border-nominal/30 py-1">
            #{l.id} · {l.point_id} · {new Date(l.timestamp).toLocaleString()} ·
            analysed={l.analysed} · blob={l.image?.size ?? 0}B · drift=
            {l.drift_score ?? "—"} · “{l.voice_transcript.slice(0, 60)}”
          </div>
        ))}
      </section>

      <section className="bg-card border border-nominal/60 p-3">
        <h2 className="text-nominal tracking-widest mb-2">
          HISTORICAL CONTEXT ({contexts.length})
        </h2>
        {contexts.map((c) => (
          <div key={c.point_id} className="border-b border-nominal/30 py-1">
            {c.point_id} · {new Date(c.updated_at).toLocaleString()} · “
            {c.last_caption.slice(0, 80)}…”
          </div>
        ))}
      </section>
    </div>
  );
}

function Btn({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 border tracking-widest ${
        danger
          ? "border-critical text-critical hover:bg-critical hover:text-bg"
          : "border-accent text-accent hover:bg-accent hover:text-bg"
      }`}
    >
      {children}
    </button>
  );
}
