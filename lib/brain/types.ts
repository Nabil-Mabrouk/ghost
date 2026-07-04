import type { DriftResult } from "@/lib/db";

// ---- The Brain interface: implemented by WorkerBrain (real) and MockBrain ----
export interface AnalyseInput {
  point_id: string;
  /** Yesterday's caption, or null on a first-ever pass (day-0 baseline). */
  historical: string | null;
  current: string;
  note: string;
}

export interface Brain {
  ensureWhisper(): Promise<void>;
  ensureGemma(): Promise<void>;
  /** 16kHz mono PCM in, transcript out. */
  transcribe(audio: Float32Array): Promise<string>;
  caption(image: Blob): Promise<string>;
  analyse(input: AnalyseInput): Promise<DriftResult>;
}

// ---- Worker message protocol (SPEC.md §2.3) ----
export type Engine = "webgpu" | "wasm";
export type ModelName = "whisper" | "gemma";

export type MainToWorker =
  | { kind: "init"; engine: Engine }
  | { kind: "ensure"; reqId: number; model: ModelName }
  | { kind: "transcribe"; reqId: number; audio: Float32Array }
  | { kind: "caption"; reqId: number; image: Blob }
  | { kind: "analyse"; reqId: number; prompt: string };

export type WorkerToMain =
  | {
      kind: "progress";
      model: ModelName;
      file: string;
      loaded: number;
      total: number;
    }
  | { kind: "engine"; engine: Engine }
  | { kind: "ready"; model: ModelName }
  | { kind: "result"; reqId: number; payload: string }
  | { kind: "error"; reqId?: number; message: string };

// Request timeouts (ms). A hung inference must never hang the sleep batch —
// callers fall back per-log and continue (TEST-PLAN.md §4).
export const TIMEOUTS = {
  ensure: 600_000, // first-time model download
  transcribe: 30_000,
  caption: 120_000,
  analyse: 120_000,
} as const;
