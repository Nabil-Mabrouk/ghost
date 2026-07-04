# GHOST-WALK

**An industrial inspection agent that sleeps.** Runs Gemma 4 E2B entirely in the browser — no cloud, no signal — logging what a field engineer sees by day, consolidating it into memory overnight, and delivering a prioritized action briefing by morning.

> Hackathon track: **Google DeepMind Remote — Edge / On-Device** (Gemma running locally, offline, privacy-first).
> Built solo, entirely during the event — see the tagged gate history (`gate-1` … ) for the build timeline.

## The problem

Site safety engineers in bandwidth-denied environments — oil fields, mines, remote plants — walk inspection rounds daily, and what they noticed yesterday evaporates. The rattle heard Monday and the tilt photographed Tuesday never meet. Cloud AI can't help where there is no cloud.

## What it does

1. **The Walk** (`/walk`) — photograph checkpoints, dictate voice notes (transcribed on-device by Whisper-tiny), one-tap event logging to IndexedDB.
2. **Sleep Mode** (`/sleep`) — docked and charging, the agent wakes Gemma 4 E2B on WebGPU: it describes each photo, recalls that checkpoint's baseline from the previous pass, and reasons about what drifted — correlating the engineer's spoken note with visual change.
3. **The Briefing** (`/briefing`) — findings ranked by drift score, critical items translated into a single imperative action: *"Check motor mount bolts on Pump A — rattle correlates with housing tilt."*

Everything — images, voice, model weights, reasoning — stays on device. It works in airplane mode; for this user, offline isn't a failure state, it's Tuesday.

## Architecture

- **Next.js 16** (App Router, `output: 'export'`) — fully static, zero backend
- **Gemma 4 E2B** (`onnx-community/gemma-4-E2B-it-ONNX`, q4f16) via **transformers.js v4** on **WebGPU**, WASM fallback — vision captioning + drift reasoning in one model
- **Whisper-tiny** for live speech-to-text at capture time (the Web Speech API is cloud-backed and fails offline — Whisper doesn't)
- All inference in a **Web Worker** with per-request timeouts; a hung generation skips one log, never the batch
- **Dexie.js / IndexedDB** for logs, image blobs, and per-checkpoint historical memory; each consolidation commits atomically and rolls the baseline forward
- **Output hardening**: tolerant JSON parse → one retry → keyword heuristic (tagged honestly as `HEURISTIC` in the briefing)
- **PWA**: service worker for the app shell; transformers.js caches weights in the Cache API — after one online initialization the full loop runs in airplane mode
- **Mock brain** (`?mock=1` or via `/dev`) — deterministic stand-in that keeps the demo loop testable without the 1.5GB model

## Run it

```bash
npm install
npm run dev        # http://localhost:3000  (camera/mic need localhost or HTTPS)
npm test           # unit tests: JSON hardening, DB state transitions, prompts, mock
npm run build      # static export to out/
```

First launch: press **INITIALIZE SYSTEM** on the boot screen while online (one-time ~1.5GB model download, cached locally). After that, airplane mode works.

Hidden operator panel at `/dev`: seed a demo baseline, toggle the mock brain, inspect/clear the database.

## Honest limitations

- Checkpoint identity is declared by the engineer (selector today, QR/NFC asset tags on the roadmap) — never inferred from vision. In safety workflows, identity must be deterministic.
- One-baseline memory: the agent compares against the previous pass only (schema supports deeper history; UI doesn't yet).
- Whisper handles STT; Gemma 4's native audio input is wired-ready but not enabled.

## Demo video

*(link added at submission)*
