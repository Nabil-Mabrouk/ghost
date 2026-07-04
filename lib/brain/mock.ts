import type { DriftResult } from "@/lib/db";
import type { AnalyseInput, Brain } from "./types";
import { setStatus } from "@/lib/status";

const HIGH_DRIFT = /rattle|leak|crack|tilt|loose|vibrat|corros|smoke|drip|grind/i;
const NOMINAL = /nominal|normal|fine|ok|good|no issue/i;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Deterministic stand-in for the real models. Keeps the full demo loop
 * recordable at all times (ROADMAP.md safety line). The "rattle" path mirrors
 * the demo script: worker note + visual tilt -> critical bolt check.
 */
export class MockBrain implements Brain {
  async ensureWhisper(): Promise<void> {
    setStatus({ whisper: "ready", whisperPct: 100 });
  }

  async ensureGemma(): Promise<void> {
    setStatus({ gemma: "ready", gemmaPct: 100 });
  }

  async transcribe(_audio: Float32Array): Promise<string> {
    await delay(700);
    return "Logging pump A. Hearing a strange rattle near the motor mount.";
  }

  async caption(_image: Blob): Promise<string> {
    await delay(1200);
    return (
      "Centrifugal pump unit on a steel skid. Motor housing shows a slight " +
      "tilt of roughly two degrees relative to the pump shaft axis. Front " +
      "left mounting bolt appears proud of its seat. No visible leaks."
    );
  }

  async analyse(input: AnalyseInput): Promise<DriftResult> {
    await delay(1500);
    if (input.historical === null) {
      return {
        drift_score: 0,
        reasoning: "No baseline in memory. Registered as day-0 observation.",
        focus_for_tomorrow: `Re-inspect ${input.point_id} to establish drift trend.`,
        drift_source: "mock",
      };
    }
    if (HIGH_DRIFT.test(input.note) || HIGH_DRIFT.test(input.current)) {
      return {
        drift_score: 8,
        reasoning:
          "Reported rattle correlates with a visible tilt of the motor " +
          "housing versus yesterday's aligned baseline; consistent with " +
          "loosening mount hardware.",
        focus_for_tomorrow: `Check and torque the motor mount bolts on ${input.point_id} before start-up.`,
        drift_source: "mock",
      };
    }
    if (NOMINAL.test(input.note)) {
      return {
        drift_score: 1,
        reasoning: "Observation matches baseline. No structural drift detected.",
        focus_for_tomorrow: `Routine pass on ${input.point_id}.`,
        drift_source: "mock",
      };
    }
    return {
      drift_score: 3,
      reasoning:
        "Minor visual differences versus baseline within normal variance; " +
        "worker note reports no acute symptom.",
      focus_for_tomorrow: `Photograph ${input.point_id} from the same angle for trend continuity.`,
      drift_source: "mock",
    };
  }
}
