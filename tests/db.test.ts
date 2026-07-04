// TEST-PLAN.md §1.2 — DB state transitions (D1–D5)
import { beforeEach, describe, expect, it } from "vitest";
import {
  addLog,
  commitInsight,
  db,
  getBriefing,
  getContext,
  getUnanalysed,
  seedContext,
  type DriftResult,
} from "../lib/db";

const jpeg = (bytes: number) =>
  new Blob([new Uint8Array(bytes).fill(0xab)], { type: "image/jpeg" });

const drift = (score: number): DriftResult => ({
  drift_score: score,
  reasoning: `Test reasoning at score ${score}.`,
  focus_for_tomorrow: "Recheck the fitting.",
  drift_source: "mock",
});

beforeEach(async () => {
  await db.logs.clear();
  await db.historical_context.clear();
});

describe("D1: addLog", () => {
  it("persists with analysed=0 and an intact Blob", async () => {
    const id = await addLog({
      point_id: "PUMP-A",
      image: jpeg(2048),
      voice_transcript: "strange rattle near the motor mount",
    });
    const row = await db.logs.get(id);
    expect(row).toBeDefined();
    expect(row!.analysed).toBe(0);
    expect(row!.point_id).toBe("PUMP-A");
    const buf = await row!.image.arrayBuffer();
    expect(buf.byteLength).toBe(2048);
    expect(new Uint8Array(buf)[0]).toBe(0xab);
  });
});

describe("D2: getUnanalysed", () => {
  it("returns only unanalysed logs, oldest first", async () => {
    const late = await addLog({
      point_id: "TANK-7",
      image: jpeg(8),
      voice_transcript: "later",
      timestamp: 2000,
    });
    const early = await addLog({
      point_id: "VALVE-4",
      image: jpeg(8),
      voice_transcript: "earlier",
      timestamp: 1000,
    });
    const done = await addLog({
      point_id: "COMP-2",
      image: jpeg(8),
      voice_transcript: "already processed",
      timestamp: 500,
    });
    await commitInsight(done, "caption", drift(1));

    const rows = await getUnanalysed();
    expect(rows.map((r) => r.id)).toEqual([early, late]);
  });
});

describe("D3: commitInsight", () => {
  it("marks the log analysed and upserts historical context atomically", async () => {
    const id = await addLog({
      point_id: "PUMP-A",
      image: jpeg(16),
      voice_transcript: "rattle",
    });
    await commitInsight(id, "Pump housing tilted ~2 degrees.", drift(8));

    const log = await db.logs.get(id);
    expect(log!.analysed).toBe(1);
    expect(log!.caption).toBe("Pump housing tilted ~2 degrees.");
    expect(log!.drift_score).toBe(8);
    expect(log!.reasoning).toContain("score 8");

    const ctx = await getContext("PUMP-A");
    expect(ctx).toBeDefined();
    expect(ctx!.last_caption).toBe("Pump housing tilted ~2 degrees.");
    expect(ctx!.last_insight).toContain("score 8");
    expect(ctx!.last_image).toBeDefined();
  });

  it("rejects for a missing log id", async () => {
    await expect(commitInsight(9999, "caption", drift(5))).rejects.toThrow();
  });
});

describe("D4: baseline rollover", () => {
  it("overwrites existing context and bumps updated_at", async () => {
    await seedContext({
      point_id: "PUMP-A",
      last_caption: "old caption",
      last_insight: "old insight",
      updated_at: 1000,
    });
    const id = await addLog({
      point_id: "PUMP-A",
      image: jpeg(16),
      voice_transcript: "note",
    });
    await commitInsight(id, "new caption", drift(3));

    const ctx = await getContext("PUMP-A");
    expect(ctx!.last_caption).toBe("new caption");
    expect(ctx!.updated_at).toBeGreaterThan(1000);
    expect(await db.historical_context.count()).toBe(1);
  });
});

describe("D5: getBriefing", () => {
  it("sorts critical drift first, then newest", async () => {
    const mild = await addLog({
      point_id: "TANK-7",
      image: jpeg(8),
      voice_transcript: "fine",
      timestamp: 3000, // newest
    });
    const critical = await addLog({
      point_id: "PUMP-A",
      image: jpeg(8),
      voice_transcript: "rattle",
      timestamp: 1000, // oldest, but critical
    });
    const pending = await addLog({
      point_id: "VALVE-4",
      image: jpeg(8),
      voice_transcript: "not yet analysed",
      timestamp: 4000,
    });
    await commitInsight(mild, "nominal", drift(3));
    await commitInsight(critical, "tilted housing", drift(8));

    const rows = await getBriefing();
    expect(rows.map((r) => r.id)).toEqual([critical, mild]);
    expect(rows.find((r) => r.id === pending)).toBeUndefined();
  });
});
