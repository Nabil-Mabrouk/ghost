import type { DriftResult, DriftSource } from "@/lib/db";

// Output hardening ladder (SPEC.md §3.3): strict parse -> bracket match ->
// regex salvage -> (caller retries) -> keyword heuristic. The briefing must
// never render empty because a 2B model got creative with punctuation.

const clamp = (n: number): number =>
  Math.max(0, Math.min(10, Math.round(n)));

/** Extract the first balanced {...} block from free text. */
function firstJsonBlock(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

export function parseDriftJson(
  raw: string,
  source: DriftSource = "model",
): DriftResult | null {
  const unfenced = raw.replace(/```(?:json)?/gi, "");
  const block = firstJsonBlock(unfenced);
  if (!block) return null;

  // Attempt strict JSON first, then a lightly repaired variant.
  const candidates = [
    block,
    block
      .replace(/'/g, '"')
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]"),
  ];
  for (const candidate of candidates) {
    try {
      const obj = JSON.parse(candidate);
      const score = Number(obj.drift_score);
      if (!Number.isFinite(score)) continue;
      return {
        drift_score: clamp(score),
        reasoning: String(obj.reasoning ?? "").trim() || "No reasoning given.",
        focus_for_tomorrow:
          String(obj.focus_for_tomorrow ?? "").trim() ||
          "Re-inspect this checkpoint on the next pass.",
        drift_source: source,
      };
    } catch {
      // fall through to the next candidate
    }
  }

  // Regex salvage: pull fields individually out of malformed JSON.
  const scoreMatch = unfenced.match(/drift_score["']?\s*[:=]\s*["']?(\d+)/i);
  if (!scoreMatch) return null;
  const field = (name: string): string => {
    const m = unfenced.match(
      new RegExp(`${name}["']?\\s*[:=]\\s*["']([^"']+)["']`, "i"),
    );
    return m ? m[1].trim() : "";
  };
  return {
    drift_score: clamp(Number(scoreMatch[1])),
    reasoning: field("reasoning") || "Model output was partially unparseable.",
    focus_for_tomorrow:
      field("focus_for_tomorrow") ||
      "Re-inspect this checkpoint on the next pass.",
    drift_source: source,
  };
}

const HIGH = /rattle|leak|crack|tilt|loose|vibrat|corros|smoke|drip|grind|hot|burn|frayed|bent/i;
const LOW = /nominal|normal|fine|no issue|unchanged|good condition/i;

/** Last-resort scoring when the model can't produce usable JSON. */
export function heuristicDrift(note: string, caption: string): DriftResult {
  const text = `${note} ${caption}`;
  let score = 4;
  if (HIGH.test(text)) score = 7;
  if (LOW.test(text) && !HIGH.test(text)) score = 1;
  const flagged = text.match(HIGH)?.[0];
  return {
    drift_score: score,
    reasoning:
      "Automated keyword assessment (model output unparseable): " +
      (flagged
        ? `observation mentions "${flagged}" — treat as elevated risk.`
        : "no acute keywords detected in the observation."),
    focus_for_tomorrow: flagged
      ? `Manually verify the reported "${flagged}" at this checkpoint.`
      : "Re-inspect this checkpoint on the next pass.",
    drift_source: "heuristic",
  };
}
