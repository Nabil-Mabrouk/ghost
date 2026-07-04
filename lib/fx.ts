"use client";

// Capture feedback: mechanical click + haptics (SPEC.md §1.1).
// Synthesized, not sampled — zero assets, zero network.

let audioCtx: AudioContext | null = null;

export function playClick(): void {
  try {
    audioCtx ??= new AudioContext();
    const t = audioCtx.currentTime;
    // Two short square blips ~ a relay snapping shut.
    for (const [offset, freq] of [
      [0, 2200],
      [0.045, 900],
    ] as const) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.04);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t + offset);
      osc.stop(t + offset + 0.05);
    }
  } catch {
    // audio is decoration — never let it break capture
  }
}

export function vibrate(ms: number): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* unsupported — fine */
  }
}
