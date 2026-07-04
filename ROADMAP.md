# GHOST-WALK — 24h Execution Roadmap

Solo developer + Claude Code. Blocks are sequential; each ends at a gate (see TEST-PLAN.md). Hours are cumulative from event start. **The rule: a recordable demo must exist at all times after hour 8.**

---

## Hour 0–0.5 — Block 0: Compliance & setup
- `git init` fresh repo **in this folder** (it currently sits inside another repo's tree — the fresh `.git` here takes precedence; verify `git status` shows only this project). Create public GitHub repo, push initial commit (SPEC.md, TEST-PLAN.md, ROADMAP.md — planning docs, no code).
- Fill Google DeepMind Remote track requirements checklist (public repo link ready for submission form).
- `npx create-next-app@latest` (TS, Tailwind, App Router, no src dir opt: use src? — accept defaults, `output: 'export'` in next.config).
- Install: `dexie`, `@huggingface/transformers`, `lucide-react`, dev: `vitest`, `fake-indexeddb`.
- Download JetBrains Mono woff2 into `/public/fonts` (offline requirement — do this while online!).
- **Also while online:** pre-download Gemma 4 E2B ONNX + Whisper-tiny once in the dev browser so the weights are in HF's CDN cache locally; bookmark model repo pages.

## Hour 0.5–3 — Block 1: Skeleton → **G1**
- Theme tokens, layout chrome: StatusBar (static values for now), TabNav, ScanlineOverlay.
- Four routes with placeholder content; boot page with fake engine badge.
- `lib/db.ts` Dexie schema + helpers; `/dev` panel with dummy-row write/read + clear DB.
- Vitest wired; D1–D5 tests written against helpers (red→green).
- Verify static export builds and serves. **Commit: `gate-1`.**

## Hour 3–6 — Block 2: Capture → **G2**
- Camera viewport (getUserMedia, 4:3, reticle), frame→JPEG Blob capture (`lib/capture.ts`).
- Point selector, editable transcript TerminalBox.
- MediaRecorder hold-to-record; **Whisper-tiny in the worker** (this de-risks the whole worker architecture early with the small model before Gemma).
- LOG EVENT persistence + glitch/sound/vibrate feedback + unprocessed counter.
- Permission-denied fallbacks (type-in transcript; camera instruction card).
- **Commit: `gate-2`.**

## Hour 6–8 — Block 3: Loop on mock brain → **G3** ← safety line
- `lib/brain/types.ts`, `mock.ts` (deterministic canned outputs incl. the "rattle→bolts" demo path), `getBrain()` factory with `?mock=1`.
- Sleep page: toggle, sequential batch over unanalysed logs, terminal visualizer, per-log commit, abort.
- Briefing page: cards, drift bar, critical styling, empty state.
- Dev panel: seed demo baseline.
- P1–P9, PR1–PR3, M1–M2 tests green. **Commit: `gate-3`. A submittable demo now exists.**

## Hour 8–14 — Block 4: Real brain → **G4** (the hard block)
- `brain.worker.ts`: transformers.js v4 init, WebGPU detect + WASM fallback, progress events, request/response correlation, timeouts.
- Gemma 4 E2B load (`onnx-community/gemma-4-E2B-it-ONNX`, q4f16; crib loader from the webml-community Gemma-4-WebGPU Space). Caption pipeline (image-text-to-text), then analysis pipeline (text-only).
- `parse.ts` hardening + retry + heuristic (tests already green from Block 3 — implementation now real).
- Boot-page INITIALIZE preload with progress.
- Live-fire calibration: photograph the actual demo props, iterate the caption + analysis prompts until drift reasoning is consistently sensible. **Budget 2h minimum for prompt calibration — it's the demo's script quality.**
- **Commit: `gate-4`.**
- ⚠️ Contingency: if Gemma-in-browser is fundamentally broken by hour 12, freeze it, ship mock brain as primary with Whisper still real, and spend the reclaimed time on S1/S3 polish. Decide at hour 12, not hour 20.

## Hour 14–17 — Block 5: Offline hardening → **G5**
- `manifest.json`, icons, service worker (app shell cache-first; pass-through for huggingface.co), `navigator.storage.persist()`.
- Warm-up → DevTools offline → hard reload → full loop. Then true Airplane Mode.
- Fix whatever leaks (fonts, favicons, any CDN reference — grep the build output for `https://`).
- **Commit: `gate-5`.**

## Hour 17–20 — Block 6: Demo production → **G6**
- Physical props staged (pump-like object; shot A upright = baseline, shot B tilted + loosened bolt).
- Seed baseline with shot A via dev panel; rehearse the 60s script (TEST-PLAN §3) until it passes 3× consecutively.
- README: what it is, track statement, architecture diagram, "built entirely during the event" note with gate-tag history, how to run, honest limitations.
- **Record the demo video now** (OBS/Loom, mic on, airplane-mode indicator in frame). Upload unlisted → link ready. *Recording at hour 20, not hour 23.5, is deliberate.*
- **Commit: `gate-6`.**

## Hour 20–24 — Block 7: Buffer & polish (strict priority order)
1. Re-record video if any earlier fix improves it.
2. S1: yesterday/today side-by-side thumbnails on critical cards (high judge value, low risk).
3. S3: neural SVG animation on sleep page.
4. S4: offline TTS briefing readout.
5. S2: Gemma native audio input (only if everything above is done — riskiest).
6. Submit form **no later than hour 23**. Never submit-blocked by an in-flight change: submission link points at `gate-6` tag state or better.

---

## Standing rules
- Commit at every gate with tag; push immediately (public timestamps = compliance evidence).
- `npm test` before every commit (<5s).
- After G6: no refactors, one commit per polish item, revert on any regression.
- Any decision taking >10 min to make → take the SPEC.md default and move.
- Claude Code drives implementation; human time goes to: prompt calibration judgment, physical props, video production, submission logistics.
