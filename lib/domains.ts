// Domain profiles: the agent is generic over "walk a route, log observations,
// consolidate drift overnight". A profile supplies the vocabulary — the
// checkpoints, the inspector persona, and what the vision pass should look at.
import type { Checkpoint } from "./points";

export interface Domain {
  id: string;
  label: string;
  /** Persona line for the overnight analysis prompt. */
  persona: string;
  /** What kind of thing a checkpoint is, for the scoring rubric. */
  subjectNoun: string;
  /** Vision prompt: what to describe in a photo. */
  captionPrompt: string;
  points: readonly Checkpoint[];
}

export const DOMAINS: readonly Domain[] = [
  {
    id: "industrial",
    label: "INDUSTRIAL SITE",
    persona:
      "You are the GHOST-WALK Site Auditor performing overnight memory consolidation",
    subjectNoun: "equipment",
    captionPrompt:
      "You are an industrial inspection camera system. Describe this equipment " +
      "photo for a maintenance record in 2-3 sentences. State: equipment type, " +
      "orientation and alignment, visible condition (rust, leaks, loose " +
      "fittings, gauge readings, tilt), and anything unusual. Physical " +
      "observations only. Respond in plain prose — no markdown, no headings, " +
      "no bullet points.",
    points: [
      { id: "PUMP-A", label: "PUMP A" },
      { id: "VALVE-4", label: "VALVE 4" },
      { id: "COMP-2", label: "COMP 2" },
      { id: "TANK-7", label: "TANK 7" },
    ],
  },
  {
    id: "agro",
    label: "FARM / AGRONOMY",
    persona:
      "You are the GHOST-WALK Field Agronomist performing overnight memory consolidation",
    subjectNoun: "crop, animal, or farm structure",
    captionPrompt:
      "You are an agronomy field inspection system. Describe this photo for a " +
      "farm record in 2-3 sentences. State: subject type (crop, plant bed, " +
      "animal, enclosure, equipment), growth stage or posture, visible " +
      "condition (leaf color, wilting, pests, lesions, coat condition, " +
      "structural damage), and anything unusual. Physical observations only. " +
      "Respond in plain prose — no markdown, no headings, no bullet points.",
    points: [
      { id: "BED-1", label: "PLANT BED 1" },
      { id: "GREENHOUSE-2", label: "GREENHSE 2" },
      { id: "COOP-3", label: "COOP 3" },
      { id: "TROUGH-4", label: "TROUGH 4" },
    ],
  },
] as const;

const KEY = "gw-domain";

export function getActiveDomain(): Domain {
  if (typeof window !== "undefined") {
    const id = localStorage.getItem(KEY);
    const found = DOMAINS.find((d) => d.id === id);
    if (found) return found;
  }
  return DOMAINS[0];
}

export function setActiveDomain(id: string): void {
  localStorage.setItem(KEY, id);
}
