// TEST-PLAN.md §1.4 — mock brain demo path (M1–M2)
import { describe, expect, it } from "vitest";
import { MockBrain } from "../lib/brain/mock";

describe("MockBrain", () => {
  it("M1: the demo 'rattle' path yields a critical, actionable insight", async () => {
    const brain = new MockBrain();
    const r = await brain.analyse({
      point_id: "PUMP-A",
      historical: "Aligned pump housing, bolts seated.",
      current: "Motor housing shows a slight tilt.",
      note: "Logging pump A. Hearing a strange rattle near the motor mount.",
    });
    expect(r.drift_score).toBeGreaterThanOrEqual(7);
    expect(r.focus_for_tomorrow).toContain("PUMP-A");
    expect(r.drift_source).toBe("mock");
  });

  it("M1b: no baseline means day-0 registration, score 0", async () => {
    const brain = new MockBrain();
    const r = await brain.analyse({
      point_id: "TANK-7",
      historical: null,
      current: "Vertical storage tank.",
      note: "first pass",
    });
    expect(r.drift_score).toBe(0);
    expect(r.reasoning).toMatch(/day-0/i);
  });

  it("M2: implements the full Brain surface", async () => {
    const brain = new MockBrain();
    await expect(brain.ensureWhisper()).resolves.toBeUndefined();
    await expect(brain.ensureGemma()).resolves.toBeUndefined();
    await expect(brain.transcribe(new Float32Array(16000))).resolves.toEqual(
      expect.any(String),
    );
    await expect(brain.caption(new Blob(["x"]))).resolves.toEqual(
      expect.any(String),
    );
  });
});
