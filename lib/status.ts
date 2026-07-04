"use client";

import { useSyncExternalStore } from "react";

// Tiny global store for the persistent status bar — no context provider
// gymnastics, works from the worker client and any page.
export type Engine = "detecting" | "webgpu" | "wasm";
export type ModelState = "cold" | "loading" | "ready" | "error";

export interface AppStatus {
  engine: Engine;
  gemma: ModelState;
  gemmaPct: number;
  whisper: ModelState;
  whisperPct: number;
}

let status: AppStatus = {
  engine: "detecting",
  gemma: "cold",
  gemmaPct: 0,
  whisper: "cold",
  whisperPct: 0,
};

const listeners = new Set<() => void>();

export function setStatus(patch: Partial<AppStatus>): void {
  status = { ...status, ...patch };
  listeners.forEach((l) => l());
}

export function getStatus(): AppStatus {
  return status;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppStatus(): AppStatus {
  return useSyncExternalStore(subscribe, getStatus, getStatus);
}
