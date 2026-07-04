# GHOST-WALK — Test Plan

Testing strategy for a 24-hour solo build: **automated unit tests only where logic can silently corrupt the demo** (parsing, DB state transitions, prompt assembly); **gate checklists** for everything the demo scenario touches; one **acceptance script** that is literally the demo video script.

Test runner: **Vitest** (+ `fake-indexeddb` for Dexie tests). Run: `npm test`. No E2E framework — the manual gates are the E2E, executed at every milestone and before every recording take.

---

## 1. Unit tests (automated, ~15 tests total)

### 1.1 `parse.ts` — drift JSON hardening (highest value)
| # | Input | Expect |
|---|---|---|
| P1 | Clean JSON `{"drift_score":8,...}` | parsed, source `model` |
| P2 | JSON wrapped in ```json fences``` | parsed |
| P3 | JSON with leading prose "Here is my analysis: {...}" | parsed via bracket match |
| P4 | Single quotes / trailing comma | recovered via regex extraction |
| P5 | `drift_score: "8"` (string) | coerced to int 8 |
| P6 | `drift_score: 15` | clamped to 10 |
| P7 | Garbage text, no braces | returns `null` → caller triggers retry/heuristic |
| P8 | `heuristicDrift("strange rattle and leak", caption)` | score ≥ 6, reasoning non-empty, source `heuristic` |
| P9 | `heuristicDrift("all nominal", caption)` | score ≤ 2 |

### 1.2 `db.ts` — state transitions (fake-indexeddb)
| # | Scenario | Expect |
|---|---|---|
| D1 | `addLog()` | row exists, `analysed === 0`, Blob round-trips intact (byte length preserved) |
| D2 | `getUnanalysed()` | returns only `analysed: 0`, ordered by timestamp |
| D3 | `commitInsight(logId, result)` | log updated + `analysed: 1` + `historical_context` upserted in one transaction |
| D4 | commitInsight on point with existing context | context overwritten, `updated_at` bumped, old caption gone |
| D5 | `getBriefing()` | returns analysed logs sorted critical-first then newest |

### 1.3 `prompts.ts`
| # | Scenario | Expect |
|---|---|---|
| PR1 | `buildAnalysisPrompt` with baseline | all three `{{slots}}` substituted, no template artifacts (`{{` absent) |
| PR2 | with `historical = null` | caller short-circuits (no-baseline path returns day-0 result without LLM) |
| PR3 | transcript containing quotes/newlines/braces | prompt stays well-formed (no injection breaking the JSON instruction) |

### 1.4 `mock.ts`
| # | Scenario | Expect |
|---|---|---|
| M1 | MockBrain.analyse for note containing "rattle" | deterministic drift ≥ 7 with pump-bolt reasoning (the demo script's canned path) |
| M2 | Mock implements the full `Brain` interface | type-level (compile) + runtime shape check |

---

## 2. Gate checklists (manual, blocking)

Each gate = commit + tag. **Do not proceed to the next roadmap block until the gate passes.**

### G1 — Skeleton (target: hour 3)
- [ ] `npm run build` produces a working static export (`out/` served with `npx serve` renders all 4 routes)
- [ ] Status bar, tab nav, scanline visible on every page; theme tokens applied
- [ ] Dexie opens; dev panel can write + read a dummy row after page reload

### G2 — Capture (target: hour 6)
- [ ] Camera renders in 4:3 with reticle on Chrome desktop
- [ ] Hold-to-record captures audio; transcript appears (Whisper) and is editable
- [ ] LOG EVENT persists image Blob + transcript + point (verify in dev panel after **full browser restart**)
- [ ] Glitch/sound/vibration feedback fires
- [ ] Unprocessed counter increments

### G3 — Full loop on mock brain (target: hour 8) ← **demo exists from here**
- [ ] With `?mock=1`: walk (2 logs) → sleep toggle → terminal shows staged pipeline → briefing renders cards
- [ ] Mock "rattle" log produces critical card (red, top, actionable line)
- [ ] Second sleep run with no new logs: "nothing to consolidate", no dupes
- [ ] Abort mid-batch keeps completed insights, leaves rest unanalysed

### G4 — Real brain (target: hour 14)
- [ ] Boot INITIALIZE downloads both models with visible progress; StatusBar shows WEBGPU
- [ ] Whisper transcribes a real spoken sentence acceptably
- [ ] Gemma captions a real photo of demo prop (sensible, physical, 2–3 sentences)
- [ ] Full real-brain loop: seeded baseline → new photo + note → sleep → plausible drift reasoning referencing the note
- [ ] Kill switch verified: flipping mock flag mid-session works without reload weirdness
- [ ] Forced-WASM run (`?engine=wasm`) completes one caption+analysis (slow OK, hang not OK)
- [ ] Timeout path: artificially set 1s timeout → heuristic fallback fires, batch continues

### G5 — Offline (target: hour 17)
- [ ] Warm up online → DevTools "Offline" → **hard reload** → app shell loads, models load from cache
- [ ] Full walk→sleep→briefing loop offline; Network tab shows zero successful external requests
- [ ] True Airplane Mode (OS level) repeat — this is the money shot for the video
- [ ] `navigator.storage.estimate()` checked; storage persisted (`navigator.storage.persist()` requested at boot)

### G6 — Demo readiness (target: hour 20)
- [ ] Acceptance script (§3) passes 3 consecutive times on real brain
- [ ] Seed → record path takes < 4 minutes end-to-end (recording feasibility)
- [ ] Repo public, README with build-during-event commit history visible, LICENSE, video link placeholder

---

## 3. Acceptance script (= demo video script, ~60s)

Prep (off-camera): fresh DB, seed baseline for PUMP-A via dev panel (yesterday's photo of the prop, upright), models warm, **Airplane Mode ON**.

1. **[0–8s]** Boot screen. Cursor points at status bar: `ENGINE: WEBGPU · MODEL: READY · SYNC: LOCAL_ONLY` + OS airplane-mode indicator in frame. *"Fully offline. Everything you'll see runs in this browser tab."*
2. **[8–25s]** WALK: select PUMP-A, frame the prop (now visibly tilted / bolt loosened vs. baseline), hold-to-talk: *"Logging Pump A — hearing a strange rattle near the motor mount."* Transcript appears. LOG EVENT → glitch flash.
3. **[25–42s]** SLEEP: engage toggle. Terminal streams: captioning → recall of yesterday's baseline → drift verdict. *"The agent sleeps: it consolidates today's observations against yesterday's memory — Gemma 4, on device."*
4. **[42–60s]** BRIEFING: critical card on top — PUMP-A, drift 8/10, reasoning correlating rattle with housing tilt, "▶ NEXT PASS: check motor mount bolts on Pump A." *"Morning briefing: a prioritized, physical action — computed overnight, no cloud, no signal."*

**Pass criteria:** no dead air > 5s (sleep pass must fit or be time-lapsed with an honest "2× speed" caption), reasoning text plausibly references both the note and a visual change, critical card is visually unmistakable.

---

## 4. Failure-mode drills (test once, before recording)

| Failure | Expected behavior | Drill |
|---|---|---|
| Gemma emits invalid JSON twice | Heuristic card with "HEURISTIC" tag; batch continues | Point mock-invalid flag in dev panel |
| Inference hang | 120s timeout → fallback, next log proceeds | Set dev timeout 1s |
| WebGPU init failure | WASM engine, StatusBar shows it, demo still records (slower) | `?engine=wasm` |
| Mic permission denied | Transcript box switches to type-in mode with hint | Deny permission in site settings |
| Camera permission denied | Viewport shows instruction card, LOG disabled | Deny permission |
| IndexedDB full / eviction | Capture shows error toast, app doesn't crash | (code review only — don't simulate) |
| Total model meltdown at hour 22 | `?mock=1` — record the video on mock brain **only if** real brain is truly dead; disclose "simulated inference" in README if used | Flag flip |

---

## 5. Test cadence

- `npm test` (unit) runs green before **every commit** — it's < 5s.
- The relevant gate checklist runs at each milestone.
- Acceptance script (§3) runs at G3 (mock), G4 (real), G5 (offline), and 3× at G6.
- After G6, **no refactors** — polish and stretch goals only, each behind its own commit so any regression is one `git revert` away.
