// TEST-PLAN.md §1.1 — drift JSON hardening (P1–P9)
import { describe, expect, it } from "vitest";
import { heuristicDrift, parseDriftJson } from "../lib/brain/parse";

describe("parseDriftJson", () => {
  it("P1: clean JSON", () => {
    const r = parseDriftJson(
      '{"drift_score": 8, "reasoning": "Housing tilted.", "focus_for_tomorrow": "Check bolts."}',
    );
    expect(r).toMatchObject({
      drift_score: 8,
      reasoning: "Housing tilted.",
      focus_for_tomorrow: "Check bolts.",
      drift_source: "model",
    });
  });

  it("P2: JSON in markdown fences", () => {
    const r = parseDriftJson(
      '```json\n{"drift_score": 5, "reasoning": "Some rust.", "focus_for_tomorrow": "Wire-brush and recheck."}\n```',
    );
    expect(r?.drift_score).toBe(5);
    expect(r?.reasoning).toBe("Some rust.");
  });

  it("P3: JSON with leading prose", () => {
    const r = parseDriftJson(
      'Here is my analysis of the pump:\n{"drift_score": 7, "reasoning": "Tilt visible.", "focus_for_tomorrow": "Inspect mount."} Hope this helps!',
    );
    expect(r?.drift_score).toBe(7);
  });

  it("P4: single quotes and trailing comma", () => {
    const r = parseDriftJson(
      "{'drift_score': 6, 'reasoning': 'Minor drift.', 'focus_for_tomorrow': 'Recheck valve seat.',}",
    );
    expect(r?.drift_score).toBe(6);
    expect(r?.reasoning).toBe("Minor drift.");
  });

  it("P5: score as string is coerced", () => {
    const r = parseDriftJson(
      '{"drift_score": "8", "reasoning": "x", "focus_for_tomorrow": "y"}',
    );
    expect(r?.drift_score).toBe(8);
  });

  it("P6: out-of-range score is clamped", () => {
    const r = parseDriftJson(
      '{"drift_score": 15, "reasoning": "x", "focus_for_tomorrow": "y"}',
    );
    expect(r?.drift_score).toBe(10);
  });

  it("P7: garbage returns null", () => {
    expect(parseDriftJson("The pump seems fine to me, thanks.")).toBeNull();
    expect(parseDriftJson("")).toBeNull();
  });

  it("fills defaults for missing text fields", () => {
    const r = parseDriftJson('{"drift_score": 4}');
    expect(r?.reasoning.length).toBeGreaterThan(0);
    expect(r?.focus_for_tomorrow.length).toBeGreaterThan(0);
  });
});

describe("heuristicDrift", () => {
  it("P8: acute keywords raise the score", () => {
    const r = heuristicDrift(
      "strange rattle and a small leak",
      "pump on skid",
    );
    expect(r.drift_score).toBeGreaterThanOrEqual(6);
    expect(r.reasoning.length).toBeGreaterThan(0);
    expect(r.drift_source).toBe("heuristic");
  });

  it("P9: nominal wording lowers the score", () => {
    const r = heuristicDrift("everything nominal today", "pump unchanged");
    expect(r.drift_score).toBeLessThanOrEqual(2);
  });
});
