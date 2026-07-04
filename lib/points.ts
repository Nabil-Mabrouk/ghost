// Inspection checkpoints are a fixed route (SPEC.md §5: no CRUD).
// Identity is declared by the engineer at capture time, never inferred from vision.
export interface Checkpoint {
  id: string;
  label: string;
}

export const POINTS: readonly Checkpoint[] = [
  { id: "PUMP-A", label: "PUMP A" },
  { id: "VALVE-4", label: "VALVE 4" },
  { id: "COMP-2", label: "COMP 2" },
  { id: "TANK-7", label: "TANK 7" },
] as const;
