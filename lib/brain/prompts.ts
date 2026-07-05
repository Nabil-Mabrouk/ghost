// Prompt templates (SPEC.md §3). Kept on the main thread so the worker stays
// a dumb text/image engine and prompts are unit-testable. Caption prompts are
// domain-specific and live in lib/domains.ts.
import { getActiveDomain, type Domain } from "@/lib/domains";

/** Neutralize characters that could break the JSON instruction framing. */
function sanitize(text: string): string {
  return text.replace(/[{}]/g, " ").replace(/\s+/g, " ").trim();
}

export function buildAnalysisPrompt(
  input: {
    point_id: string;
    historical: string;
    current: string;
    note: string;
  },
  domain: Domain = getActiveDomain(),
): string {
  return [
    `${domain.persona}`,
    `for checkpoint ${sanitize(input.point_id)}.`,
    "",
    `HISTORICAL_BASELINE (previous pass): ${sanitize(input.historical)}`,
    `CURRENT_OBSERVATION (this pass): ${sanitize(input.current)}`,
    `WORKER_NOTE (voice log): ${sanitize(input.note)}`,
    "",
    "Compare current vs baseline. Identify structural drift or anomalies.",
    "Correlate the worker note with visual evidence.",
    "Score drift_score on this scale:",
    "0-2 = no meaningful change, worker reports nothing acute.",
    "3-4 = cosmetic or environmental difference (lighting, angle, background); no structural concern.",
    "5-6 = EITHER a visible physical change OR an acute worker-reported symptom (noise, leak, vibration, smell, wilting, limping), but not both.",
    `7-8 = a visible physical change to the ${domain.subjectNoun} (tilt, displacement, loose part, leak, deformation, lesions, decline) AND a worker-reported symptom that plausibly share a cause.`,
    "9-10 = clear damage or imminent failure indicators.",
    "A reported symptom like a rattle or leak is evidence even when the photo cannot show it — never score below 5 when the worker reports an acute symptom.",
    "Respond with ONLY a JSON object, no markdown:",
    '{"drift_score": <integer 0-10>, "reasoning": "<2 sentences>", "focus_for_tomorrow": "<one imperative instruction>"}',
  ].join("\n");
}

export const RETRY_SUFFIX =
  "\n\nYour last reply was not valid JSON. Reply with ONLY the JSON object, " +
  "starting with { and ending with }.";
