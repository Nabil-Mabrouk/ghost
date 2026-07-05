import Link from "next/link";
import {
  Code2,
  Footprints,
  Moon,
  PlayCircle,
  Rocket,
  ShieldOff,
  Sunrise,
} from "lucide-react";

// Public landing page: explains the project, hosts the demo film, and hands
// visitors off to the live app (/init). The app itself starts one click away.
export default function LandingPage() {
  return (
    <div className="max-w-3xl mx-auto px-5 pb-20">
      {/* Hero */}
      <section className="text-center pt-16 pb-10">
        <p className="text-[10px] tracking-[0.4em] text-nominal uppercase mb-4">
          Edge · On-device · Gemma 4
        </p>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-[0.2em] text-accent">
          GHOST-WALK
        </h1>
        <p className="mt-4 text-sm text-text/90 max-w-xl mx-auto leading-relaxed">
          An industrial inspection agent that <b>sleeps</b>. It captures what a
          field engineer sees by day, consolidates it into memory overnight —
          entirely inside a browser tab, with zero connectivity — and delivers
          a prioritized action briefing by morning.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/init"
            className="flex items-center gap-2 bg-accent text-bg font-bold px-6 py-3 text-sm tracking-widest hover:opacity-90"
          >
            <Rocket size={16} /> LAUNCH THE APP
          </Link>
          <a
            href="#film"
            className="flex items-center gap-2 border border-accent text-accent px-6 py-3 text-sm tracking-widest hover:bg-accent hover:text-bg"
          >
            <PlayCircle size={16} /> WATCH THE FILM
          </a>
          <a
            href="https://github.com/Nabil-Mabrouk/ghost"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 border border-nominal/60 text-nominal px-6 py-3 text-sm tracking-widest hover:text-text hover:border-text"
          >
            <Code2 size={16} /> SOURCE
          </a>
        </div>
      </section>

      {/* Demo film */}
      <section id="film" className="mb-14">
        <h2 className="text-[10px] tracking-[0.3em] text-nominal uppercase mb-3">
          60-second demo
        </h2>
        <div className="bg-card border border-nominal/60 p-1">
          <video
            controls
            preload="metadata"
            playsInline
            className="w-full aspect-video bg-bg"
            src="/demo/ghostwalk-demo.mp4"
          />
        </div>
        <p className="mt-2 text-[10px] text-nominal tracking-wide">
          Site imagery in the film is AI-generated. All application footage is
          a live screen recording of the working app — the same build you can
          launch above.
        </p>
      </section>

      {/* The loop */}
      <section className="mb-14">
        <h2 className="text-[10px] tracking-[0.3em] text-nominal uppercase mb-3">
          The loop
        </h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <Phase
            icon={<Footprints size={18} />}
            title="1 · THE WALK"
            body="The engineer photographs fixed checkpoints and dictates voice notes — transcribed on-device by Whisper. Every observation is logged locally."
          />
          <Phase
            icon={<Moon size={18} />}
            title="2 · THE SLEEP"
            body="Heavy reasoning would drain a field device mid-round, so it waits for the night dock: wall power, idle GPU. Gemma 4 captions each photo, recalls that checkpoint's baseline, and scores what drifted."
          />
          <Phase
            icon={<Sunrise size={18} />}
            title="3 · THE BRIEFING"
            body="By morning: a triaged worklist. Critical drift becomes one imperative action — 'Check the mount bolts on Pump A. Before start-up.'"
          />
        </div>
      </section>

      {/* Offline claim */}
      <section className="mb-14 bg-card border border-nominal/60 p-4 flex gap-4 items-start">
        <ShieldOff className="text-accent shrink-0 mt-1" size={20} />
        <p className="text-xs leading-relaxed">
          <b className="text-accent">Nothing leaves the device.</b> Images,
          voice, model weights, and reasoning all live in the browser. After a
          one-time initialization, the entire loop — capture, consolidation,
          briefing — runs in airplane mode. For bandwidth-denied sites,
          offline isn&apos;t a failure state; it&apos;s Tuesday.
        </p>
      </section>

      {/* Try it */}
      <section className="mb-14">
        <h2 className="text-[10px] tracking-[0.3em] text-nominal uppercase mb-3">
          Test it yourself — 5 minutes
        </h2>
        <div className="bg-card border border-nominal/60 p-4 text-xs leading-relaxed space-y-2">
          <p className="text-[10px] tracking-widest text-critical uppercase">
            Requirements: desktop Chrome or Edge with WebGPU · ~1.5GB one-time
            model download · camera/mic optional
          </p>
          <ol className="list-decimal list-inside space-y-1.5">
            <li>
              <b>LAUNCH THE APP</b> → press <b>INITIALIZE SYSTEM</b> and let
              both models reach READY (one-time download; cached after).
            </li>
            <li>
              On <b>WALK</b>: pick a checkpoint, then either point your camera
              at any object — or use the <b>⬆ IMPORT</b> button with two
              photos of the same subject (one healthy, one visibly changed).
            </li>
            <li>
              Add a voice note (hold the mic button) or type one — e.g.
              &ldquo;hearing a strange rattle&rdquo; — then <b>LOG EVENT</b>.
            </li>
            <li>
              Go to <b>SLEEP</b> and flip the toggle: the first pass registers
              your photo as the day-0 baseline (~30s).
            </li>
            <li>
              Log the <i>changed</i> photo of the same subject with a symptom
              note, sleep again — and open the <b>BRIEFING</b> to see the
              agent correlate your note with what changed in the pixels.
            </li>
          </ol>
          <p className="text-nominal">
            Tip: navigate with the bottom tabs — a page reload evicts the
            model from GPU memory and the next sleep re-wakes it (~2 min).
          </p>
        </div>
      </section>

      {/* Stack */}
      <section className="mb-14">
        <h2 className="text-[10px] tracking-[0.3em] text-nominal uppercase mb-3">
          Stack
        </h2>
        <p className="text-xs text-nominal leading-relaxed">
          Gemma 4 E2B (ONNX q4f16, WebGPU) · transformers.js v4 · Whisper-tiny
          · Next.js 16 static export · Web Worker inference · Dexie /
          IndexedDB · PWA — <b className="text-text">zero backend</b>. This
          page and the app are plain static files.
        </p>
      </section>

      <footer className="border-t border-nominal/40 pt-4 text-[10px] tracking-widest text-nominal uppercase flex flex-wrap gap-2 justify-between">
        <span>Built solo, in 24h, during the hackathon — Nabil Mabrouk</span>
        <a
          href="https://github.com/Nabil-Mabrouk/ghost"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          github.com/Nabil-Mabrouk/ghost
        </a>
      </footer>
    </div>
  );
}

function Phase({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="bg-card border border-nominal/60 p-4">
      <div className="flex items-center gap-2 text-accent mb-2">
        {icon}
        <h3 className="text-[11px] tracking-widest font-bold">{title}</h3>
      </div>
      <p className="text-[11px] leading-relaxed text-text/90">{body}</p>
    </div>
  );
}
