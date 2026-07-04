"use client";

import type { DriftResult } from "@/lib/db";
import { setStatus } from "@/lib/status";
import { MockBrain } from "./mock";
import { heuristicDrift, parseDriftJson } from "./parse";
import { buildAnalysisPrompt, RETRY_SUFFIX } from "./prompts";
import {
  TIMEOUTS,
  type AnalyseInput,
  type Brain,
  type MainToWorker,
  type ModelName,
  type WorkerToMain,
} from "./types";

interface Pending {
  resolve: (payload: string) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

class WorkerBrain implements Brain {
  private worker: Worker | null = null;
  private nextReqId = 1;
  private pending = new Map<number, Pending>();
  // loaded/total per file, per model — drives the status bar percentage.
  private files: Record<ModelName, Map<string, { loaded: number; total: number }>> =
    { whisper: new Map(), gemma: new Map() };

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL("./brain.worker.ts", import.meta.url));
      this.worker.onmessage = (e: MessageEvent<WorkerToMain>) =>
        this.handle(e.data);
      this.worker.onerror = (e) => {
        const err = new Error(`brain worker crashed: ${e.message}`);
        this.pending.forEach((p) => {
          clearTimeout(p.timer);
          p.reject(err);
        });
        this.pending.clear();
        this.worker = null;
      };
      const engine = "gpu" in navigator ? "webgpu" : "wasm";
      setStatus({ engine });
      this.post({ kind: "init", engine });
    }
    return this.worker;
  }

  private post(msg: MainToWorker): void {
    this.getWorker().postMessage(msg);
  }

  private handle(msg: WorkerToMain): void {
    switch (msg.kind) {
      case "engine":
        setStatus({ engine: msg.engine });
        break;
      case "progress": {
        let pct: number;
        if (msg.file === "__total__") {
          // Library-aggregated percentage — trust it directly.
          pct = msg.loaded;
        } else {
          const files = this.files[msg.model];
          files.set(msg.file, { loaded: msg.loaded, total: msg.total });
          let loaded = 0;
          let total = 0;
          files.forEach((f) => {
            loaded += f.loaded;
            total += f.total;
          });
          pct = total ? Math.floor((loaded / total) * 100) : 0;
        }
        setStatus(
          msg.model === "gemma"
            ? { gemma: "loading", gemmaPct: pct }
            : { whisper: "loading", whisperPct: pct },
        );
        break;
      }
      case "ready":
        setStatus(
          msg.model === "gemma"
            ? { gemma: "ready", gemmaPct: 100 }
            : { whisper: "ready", whisperPct: 100 },
        );
        break;
      case "result":
      case "error": {
        if (msg.reqId === undefined) break;
        const p = this.pending.get(msg.reqId);
        if (!p) break;
        this.pending.delete(msg.reqId);
        clearTimeout(p.timer);
        if (msg.kind === "result") p.resolve(msg.payload);
        else p.reject(new Error(msg.message));
        break;
      }
    }
  }

  private request(
    msg:
      | { kind: "ensure"; model: ModelName }
      | { kind: "transcribe"; audio: Float32Array }
      | { kind: "caption"; image: Blob }
      | { kind: "analyse"; prompt: string },
    timeoutMs: number,
    transfer: Transferable[] = [],
  ): Promise<string> {
    const reqId = this.nextReqId++;
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(reqId);
        reject(new Error(`brain request timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.pending.set(reqId, { resolve, reject, timer });
      this.getWorker().postMessage({ ...msg, reqId }, transfer);
    });
  }

  async ensureWhisper(): Promise<void> {
    await this.request({ kind: "ensure", model: "whisper" }, TIMEOUTS.ensure);
  }

  async ensureGemma(): Promise<void> {
    await this.request({ kind: "ensure", model: "gemma" }, TIMEOUTS.ensure);
  }

  async transcribe(audio: Float32Array): Promise<string> {
    return this.request(
      { kind: "transcribe", audio },
      TIMEOUTS.transcribe,
      [audio.buffer as ArrayBuffer],
    );
  }

  async caption(image: Blob): Promise<string> {
    return this.request({ kind: "caption", image }, TIMEOUTS.caption);
  }

  async analyse(input: AnalyseInput): Promise<DriftResult> {
    if (input.historical === null) {
      // Day-0: nothing to compare against — the caption becomes the baseline.
      return {
        drift_score: 0,
        reasoning: "No baseline in memory. Registered as day-0 observation.",
        focus_for_tomorrow: `Re-inspect ${input.point_id} to establish drift trend.`,
        drift_source: "baseline",
      };
    }
    const prompt = buildAnalysisPrompt({
      point_id: input.point_id,
      historical: input.historical,
      current: input.current,
      note: input.note,
    });
    try {
      const raw = await this.request(
        { kind: "analyse", prompt },
        TIMEOUTS.analyse,
      );
      const parsed = parseDriftJson(raw, "model");
      if (parsed) return parsed;

      const retryRaw = await this.request(
        { kind: "analyse", prompt: prompt + RETRY_SUFFIX },
        TIMEOUTS.analyse,
      );
      const retried = parseDriftJson(retryRaw, "retry");
      if (retried) return retried;
    } catch {
      // timeout or worker fault — fall through to the heuristic
    }
    return heuristicDrift(input.note, input.current);
  }
}

let instance: Brain | null = null;
let instanceIsMock = false;

export function isMockEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (new URLSearchParams(window.location.search).get("mock") === "1")
    return true;
  return localStorage.getItem("gw-mock") === "1";
}

/** The one place that decides real vs mock brain (SPEC.md §0). */
export function getBrain(): Brain {
  const wantMock = isMockEnabled();
  if (!instance || instanceIsMock !== wantMock) {
    instance = wantMock ? new MockBrain() : new WorkerBrain();
    instanceIsMock = wantMock;
  }
  return instance;
}
