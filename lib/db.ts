import Dexie, { type Table } from "dexie";

// `analysed` is 0 | 1 because booleans are not valid IndexedDB index keys.
export interface LogEntry {
  id?: number;
  timestamp: number;
  point_id: string;
  image: Blob;
  voice_transcript: string;
  analysed: 0 | 1;
  caption?: string;
  drift_score?: number;
  reasoning?: string;
  focus_for_tomorrow?: string;
  drift_source?: DriftSource;
}

export interface HistoricalContext {
  point_id: string;
  last_caption: string;
  last_insight: string;
  last_image?: Blob;
  updated_at: number;
}

export type DriftSource = "model" | "retry" | "heuristic" | "mock" | "baseline";

export interface DriftResult {
  drift_score: number;
  reasoning: string;
  focus_for_tomorrow: string;
  drift_source: DriftSource;
}

export const CRITICAL_THRESHOLD = 7;

class GhostWalkDB extends Dexie {
  logs!: Table<LogEntry, number>;
  historical_context!: Table<HistoricalContext, string>;

  constructor() {
    super("ghostwalk");
    this.version(1).stores({
      logs: "++id, timestamp, point_id, analysed",
      historical_context: "point_id",
    });
  }
}

export const db = new GhostWalkDB();

export async function addLog(input: {
  point_id: string;
  image: Blob;
  voice_transcript: string;
  timestamp?: number;
}): Promise<number> {
  return db.logs.add({
    timestamp: input.timestamp ?? Date.now(),
    point_id: input.point_id,
    image: input.image,
    voice_transcript: input.voice_transcript,
    analysed: 0,
  });
}

export async function getUnanalysed(): Promise<LogEntry[]> {
  const rows = await db.logs.where("analysed").equals(0).toArray();
  return rows.sort((a, b) => a.timestamp - b.timestamp);
}

export async function countUnanalysed(): Promise<number> {
  return db.logs.where("analysed").equals(0).count();
}

export async function getContext(
  point_id: string,
): Promise<HistoricalContext | undefined> {
  return db.historical_context.get(point_id);
}

/**
 * Atomically record a consolidation result: the log becomes analysed and
 * today's observation becomes the new historical baseline for the checkpoint.
 * Committed per-log so an aborted batch loses nothing (SPEC.md §1.2).
 */
export async function commitInsight(
  logId: number,
  caption: string,
  result: DriftResult,
): Promise<void> {
  await db.transaction("rw", db.logs, db.historical_context, async () => {
    const log = await db.logs.get(logId);
    if (!log) throw new Error(`commitInsight: log ${logId} not found`);
    await db.logs.update(logId, {
      analysed: 1,
      caption,
      drift_score: result.drift_score,
      reasoning: result.reasoning,
      focus_for_tomorrow: result.focus_for_tomorrow,
      drift_source: result.drift_source,
    });
    await db.historical_context.put({
      point_id: log.point_id,
      last_caption: caption,
      last_insight: result.reasoning,
      last_image: log.image,
      updated_at: Date.now(),
    });
  });
}

/** Analysed logs, critical drift first, then newest first. */
export async function getBriefing(): Promise<LogEntry[]> {
  const rows = await db.logs.where("analysed").equals(1).toArray();
  return rows.sort((a, b) => {
    const aCrit = (a.drift_score ?? 0) >= CRITICAL_THRESHOLD ? 1 : 0;
    const bCrit = (b.drift_score ?? 0) >= CRITICAL_THRESHOLD ? 1 : 0;
    if (aCrit !== bCrit) return bCrit - aCrit;
    return b.timestamp - a.timestamp;
  });
}

/** Seed a historical baseline directly (dev panel / demo prep). */
export async function seedContext(ctx: HistoricalContext): Promise<void> {
  await db.historical_context.put(ctx);
}

export async function clearAll(): Promise<void> {
  await db.transaction("rw", db.logs, db.historical_context, async () => {
    await db.logs.clear();
    await db.historical_context.clear();
  });
}
