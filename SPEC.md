# GHOST-WALK — Technical Specification

**Offline-first industrial agent for temporal drift reasoning, powered by Gemma 4 E2B running entirely in the browser.**

- **Hackathon track:** Statement Five — Google DeepMind Remote (Edge / On-Device: Gemma running locally, offline, privacy-first)
- **Team:** solo, remote
- **Judging:** 1-minute demo video + public repo + description. Demo weight 50%.

---

## 0. Locked decisions

| Decision | Choice | Rationale |
|---|---|---|
| Reasoning/vision model | **Gemma 4 E2B** — `onnx-community/gemma-4-E2B-it-ONNX`, q4f16 | Track requirement; multimodal (image+text); ~1–2GB; runs on WebGPU via transformers.js v4 |
| Live speech-to-text | **Whisper-tiny** (`onnx-community/whisper-tiny.en`) at capture time; editable text field as universal fallback | Web Speech API is cloud-backed (fails offline). Whisper-tiny is ~40MB, loads fast, keeps `/walk` responsive. Gemma-4 audio input = stretch goal only |
| Drift score | **Hybrid**: Gemma emits JSON; tolerant parser + retry; keyword heuristic as final fallback | Small models flake on strict JSON; briefing must never render empty |
| Inference location | Web Worker (`brain.worker.ts`), one worker owns all models | UI must not freeze during sleep pass |
| Mock brain | Full mock implementation behind the same interface, toggled via `?mock=1` / localStorage | Demo loop must work end-to-end from hour ~6, regardless of model state |
| Framework | Next.js 15, App Router, `output: 'export'`, 100% client-side | Spec requirement; no backend anywhere |
| Storage | Dexie.js v4 (IndexedDB), image/audio stored as Blobs | Offline persistence |
| Styling | Tailwind CSS v4 + Lucide React, "Industrial Tactical" theme | Spec |
| PWA | `manifest.json` + hand-written service worker for app shell; transformers.js auto-caches model weights in Cache API | Must survive Airplane Mode after first load |
| Demo platform | Laptop, Chrome (WebGPU stable), `localhost`, webcam pointed at physical props | Camera needs secure context; desktop WebGPU is the reliable path; judging is by video so no phone needed |
| Repo | Fresh `git init` in this folder at event start; public on GitHub; commit at every gate | "New work only" compliance — timestamps are the proof |

**Pitch framing guardrail:** always describe as a *temporal reasoning agent with a sleep/memory-consolidation cycle*. Never "image analyzer", never lead with the briefing screen (banned-category adjacency: image analyzers, dashboard-as-main-feature).

---

## 1. Product spec — the three phases

### 1.1 `/walk` — The Active Walk
The engineer walks the site logging observations.

- **Camera viewport:** live `getUserMedia` feed, fixed 4:3, corner-bracket "scanning reticle" overlay (pure CSS/SVG).
- **Point selector:** horizontal button group of checkpoint IDs (`PUMP-A`, `VALVE-4`, `COMP-2`, `TANK-7`). Selected = safety-yellow fill. Points are hardcoded constants (no CRUD — out of scope).
- **Hold-to-transcribe button:** press-and-hold records mic audio (MediaRecorder). On release: audio → Whisper in worker → transcript streams into a neon-yellow terminal box. Transcript is **editable** (fallback if STT misfires or model not ready).
- **LOG EVENT button:** captures current video frame to JPEG Blob (canvas, ~1024px wide, quality 0.8) + transcript + point_id + timestamp → `logs` table with `analysed: 0`. Feedback: CSS glitch flash + mechanical click (short base64 WAV) + `navigator.vibrate(80)` where supported.
- **Log counter chip:** "UNPROCESSED: n" so the demo shows accumulation.

### 1.2 `/sleep` — Consolidation
The device is docked for the night; the agent consolidates memory.

- **Trigger:** industrial toggle switch — "ENGAGE MAINTENANCE SLEEP".
- **Pipeline per unanalysed log (sequential):**
  1. Ensure Gemma loaded (loading progress rendered as terminal lines).
  2. **CAPTION** — Gemma vision: describe the current image (industrial-inspection prompt, §3.1).
  3. **RECALL** — fetch `historical_context[point_id]` (yesterday's caption + insight).
  4. **REASON** — Gemma text: historical caption vs current caption + worker note → JSON `{drift_score, reasoning, focus_for_tomorrow}` (§3.2). Tolerant parse → retry once → heuristic fallback (§3.3).
  5. **COMMIT** — update log (`analysed: 1`, caption, drift fields); upsert `historical_context` with today's caption/insight. Each log's result is committed immediately so a crash mid-batch loses nothing.
- **Visualizer:** scrolling terminal log (`> CAPTIONING PUMP-A ...`, `> RECALL: baseline 2026-07-03`, `> DRIFT 8/10 — CRITICAL`) + a pulsing "consolidation" progress bar. First-visit note if no baseline exists: `> NO BASELINE — REGISTERING AS DAY-0 MEMORY`.
- **Completion:** "CONSOLIDATION COMPLETE — n insights" + vibration + button → `/briefing`.
- **Abort/wake:** toggle off stops after the current log (already-committed results kept).

### 1.3 `/briefing` — The Morning Briefing
- Header: "MORNING BRIEFING — {date}" + counts (points checked, anomalies).
- **Insight cards** (newest first): point ID, thumbnail, drift score as 0–10 segment bar, reasoning, `focus_for_tomorrow` as "▶ NEXT PASS:" line.
- `drift_score >= 7`: red border, "CRITICAL" tag, sorted to top, single actionable sentence prominent.
- `drift_score <= 2`: dim "NOMINAL" card.
- Empty state: "NO CONSOLIDATED MEMORY — RUN A WALK, THEN SLEEP."

### 1.4 Persistent chrome (all pages)
- **Status bar** (top, fixed): `GHOST-WALK` wordmark · `ENGINE: WEBGPU|WASM` · `MODEL: READY|COLD|LOADING n%` · `SYNC: LOCAL_ONLY` · online/offline dot (green when `navigator.onLine === false` — offline is the *good* state).
- **Bottom tab nav:** WALK / SLEEP / BRIEFING (Lucide: footprints, moon, sunrise).
- **Scanline overlay:** fixed, `pointer-events-none`, subtle repeating-linear-gradient.

### 1.5 Dev panel (hidden route `/dev`)
- Seed demo baseline (loads bundled `public/demo/*.jpg` + canned captions into `historical_context`, backdated 1 day).
- Toggle mock brain. Clear DB. Dump DB to console. Force re-download models.

---

## 2. Architecture

### 2.1 Repo layout
```
/app
  layout.tsx            # chrome: StatusBar, TabNav, ScanlineOverlay
  page.tsx              # boot screen: engine detect, INITIALIZE (model preload), nav
  walk/page.tsx
  sleep/page.tsx
  briefing/page.tsx
  dev/page.tsx
/components             # StatusBar, TabNav, Reticle, TerminalBox, ToggleSwitch,
                        # InsightCard, DriftBar, GlitchButton, ScanlineOverlay
/lib
  db.ts                 # Dexie schema + typed helpers
  brain/
    types.ts            # BrainRequest/BrainResponse discriminated unions
    client.ts           # BrainClient: promise API over worker postMessage
    brain.worker.ts     # owns transformers.js pipelines (Gemma, Whisper)
    mock.ts             # MockBrain: same interface, canned outputs, fake delays
    prompts.ts          # buildCaptionPrompt, buildAnalysisPrompt
    parse.ts            # parseDriftJson (tolerant), heuristicDrift
  capture.ts            # frameToBlob, audio recording helpers
  points.ts             # checkpoint constants
  fx.ts                 # sound + vibration helpers
/public
  manifest.json, sw.js, icons/, demo/   # demo baseline images
/tests                  # vitest unit tests (see TEST-PLAN.md)
SPEC.md  TEST-PLAN.md  ROADMAP.md  README.md
```

### 2.2 Database schema (Dexie v4)
```ts
// booleans are not indexable in IndexedDB → analysed is 0 | 1
db.version(1).stores({
  logs: '++id, timestamp, point_id, analysed',
  historical_context: 'point_id',
});
```
```ts
interface LogEntry {
  id?: number;
  timestamp: number;          // Date.now()
  point_id: string;
  image: Blob;                // JPEG
  voice_transcript: string;
  analysed: 0 | 1;
  caption?: string;           // filled during sleep
  drift_score?: number;       // 0–10
  reasoning?: string;
  focus_for_tomorrow?: string;
  drift_source?: 'model' | 'retry' | 'heuristic' | 'mock';
}
interface HistoricalContext {
  point_id: string;
  last_caption: string;
  last_insight: string;
  last_image?: Blob;          // thumbnail for briefing comparison
  updated_at: number;
}
```

### 2.3 Brain worker protocol
Worker messages (discriminated unions in `types.ts`):
```
main → worker:  {kind:'init', engine:'webgpu'|'wasm'}
                {kind:'transcribe', reqId, audio: Float32Array}
                {kind:'caption',    reqId, image: ImageDataLike}
                {kind:'analyse',    reqId, historical: string|null, current: string, note: string}
worker → main:  {kind:'progress', model:'gemma'|'whisper', file, pct}
                {kind:'ready', model}
                {kind:'result', reqId, payload}
                {kind:'error',  reqId?, message}
```
- `BrainClient` wraps this in promises with per-request timeout (caption 120s, analyse 120s, transcribe 30s) — a hung inference must not hang the sleep loop; timeout → heuristic fallback for that log, continue batch.
- Engine selection: `navigator.gpu` present → try WebGPU; on init failure → WASM retry; surface active engine to StatusBar. WASM path is *functional but slow* — acceptable because judging is recorded.
- `MockBrain` implements the same client interface; selection happens in a `getBrain()` factory reading `?mock=1` / localStorage.

### 2.4 Model loading & caching
- transformers.js v4 (`@huggingface/transformers`) with default browser Cache API storage → weights persist offline after first load.
- Boot page "INITIALIZE SYSTEM" pre-warms both models with progress UI, so `/sleep` never shows a cold 2GB download mid-demo.
- Whisper loads eagerly on `/walk` mount; Gemma loads lazily on first sleep (or via boot preload).

### 2.5 PWA / offline
- `manifest.json`: standalone, dark theme (#0D0D0D), icons 192/512.
- `sw.js`: cache-first for the exported static shell (precache on install: `/`, `_next/static/*` via build-generated list — keep simple: runtime cache-first with network fallback for same-origin GETs). Model CDN requests are handled by transformers.js Cache API — SW must **not** intercept `huggingface.co` (pass-through).
- Acceptance: full walk→sleep→briefing loop in Airplane Mode after one online warm-up (Gate G5).

---

## 3. Prompt engineering

### 3.1 Caption (Gemma vision)
```
[image]
You are an industrial inspection camera system. Describe this equipment
photo for a maintenance record in 2–3 sentences. State: equipment type,
orientation/alignment, visible condition (rust, leaks, loose fittings,
gauge readings, tilt), and anything unusual. Physical observations only.
```

### 3.2 Drift analysis (Gemma text)
```
You are the GHOST-WALK Site Auditor performing overnight memory
consolidation for checkpoint {{point_id}}.

HISTORICAL_BASELINE (previous pass): {{last_caption}}
CURRENT_OBSERVATION (this pass): {{current_caption}}
WORKER_NOTE (voice log): {{voice_transcript}}

Compare current vs baseline. Identify structural drift or anomalies.
Correlate the worker note with visual evidence.
Respond with ONLY a JSON object, no markdown:
{"drift_score": <integer 0-10>, "reasoning": "<2 sentences>", "focus_for_tomorrow": "<one imperative instruction>"}
```
No-baseline case skips the LLM call: caption becomes the day-0 baseline, insight = "Baseline registered", drift_score = 0.

### 3.3 Output hardening (`parse.ts`)
1. Strip code fences; find first `{...}` via bracket matching; `JSON.parse`.
2. On failure: regex-extract `drift_score"?\s*:\s*(\d+)` and quoted string fields.
3. On failure: **retry once** with appended "Your last reply was not valid JSON. Reply with only the JSON object."
4. Final fallback: `heuristicDrift(note, currentCaption)` — keyword table (`leak|crack|tilt|rattle|loose|corrosion|smoke → high`, `normal|nominal|fine → low`), reasoning = "Automated keyword assessment (model output unparseable): …". Record `drift_source` so the briefing can show a subtle "HEURISTIC" tag (honesty > fake confidence).
5. Clamp score to 0–10 integer.

---

## 4. Visual design tokens

```
--bg:        #0D0D0D    background
--card:      #1A1A1A    cards / panels
--accent:    #EFFF00    safety yellow (actions, live data, selection)
--critical:  #FF3B30    drift ≥ 7
--nominal:   #4A4A4A    dim/inactive
--ok:        #22C55E    ready states
font: JetBrains Mono (self-hosted woff2 — no Google Fonts CDN at runtime; offline!)
```
Details: 1px `--nominal` card borders, uppercase tracking-widest labels, corner-bracket decorations, scanline overlay at ~3% opacity, glitch keyframe animation for capture feedback.

---

## 5. Explicit non-goals (do not build)
- No backend, no auth, no accounts, no cloud sync.
- No checkpoint CRUD (hardcoded points).
- No multi-day history UI (only "last pass" baseline — the schema supports more; UI doesn't).
- No mobile-specific build (responsive enough for the video, tested on desktop Chrome only).
- No Gemma audio-input path unless everything else is done (stretch S2).
- No embedding/CLIP similarity (dropped — Gemma captions carry the comparison).

## 6. Stretch goals (only after Gate G6)
- **S1:** side-by-side yesterday/today thumbnails on critical cards.
- **S2:** Gemma-4 native audio input replacing Whisper ("one model does everything").
- **S3:** neural-network SVG animation on sleep page (replacing plain progress bar).
- **S4:** briefing text-to-speech via Web Speech synthesis (works offline, unlike recognition).
