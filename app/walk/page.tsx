"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Mic, Upload, X, Zap } from "lucide-react";
import Reticle from "@/components/Reticle";
import { getBrain } from "@/lib/brain/client";
import {
  fileToBlob,
  frameToBlob,
  startAudioRecording,
  type AudioRecording,
} from "@/lib/capture";
import { addLog, countUnanalysed } from "@/lib/db";
import { getActiveDomain } from "@/lib/domains";
import { playClick, vibrate } from "@/lib/fx";

type MicState = "idle" | "recording" | "transcribing" | "denied";

interface Imported {
  blob: Blob;
  url: string;
}

export default function WalkPage() {
  const [domain] = useState(getActiveDomain);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recordingRef = useRef<AudioRecording | null>(null);
  const [camReady, setCamReady] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [point, setPoint] = useState(domain.points[0].id);
  const [transcript, setTranscript] = useState("");
  const [micState, setMicState] = useState<MicState>("idle");
  const [unprocessed, setUnprocessed] = useState(0);
  const [flash, setFlash] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imported, setImported] = useState<Imported | null>(null);

  const refreshCount = useCallback(async () => {
    setUnprocessed(await countUnanalysed());
  }, []);

  // Camera lifecycle
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 960 },
          },
        });
        if (cancelled || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCamReady(true);
      } catch {
        if (!cancelled)
          setCamError(
            "CAMERA UNAVAILABLE — grant permission and reload, use IMPORT, or check that no other app holds the device.",
          );
      }
    })();
    refreshCount();
    // Warm the small STT model so hold-to-talk responds immediately.
    getBrain()
      .ensureWhisper()
      .catch(() => {});
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [refreshCount]);

  function clearImport() {
    if (imported) URL.revokeObjectURL(imported.url);
    setImported(null);
  }

  async function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    try {
      const blob = await fileToBlob(file);
      clearImport();
      setImported({ blob, url: URL.createObjectURL(blob) });
    } catch {
      setCamError("IMPORT FAILED — unsupported or corrupt file.");
    }
  }

  // Hold-to-transcribe
  async function micDown() {
    if (micState !== "idle") return;
    try {
      recordingRef.current = await startAudioRecording();
      setMicState("recording");
    } catch {
      setMicState("denied");
    }
  }

  async function micUp() {
    const rec = recordingRef.current;
    recordingRef.current = null;
    if (!rec) return;
    setMicState("transcribing");
    try {
      const pcm = await rec.stop();
      if (pcm.length < 4800) {
        // <0.3s of audio — accidental tap, ignore.
        setMicState("idle");
        return;
      }
      const text = await getBrain().transcribe(pcm);
      setTranscript((prev) => (prev ? `${prev} ${text}` : text));
    } catch {
      // STT failed — the textarea stays usable as typed input.
    } finally {
      setMicState("idle");
    }
  }

  const canLog = (camReady || imported !== null) && !saving;

  async function logEvent() {
    if (!canLog) return;
    setSaving(true);
    try {
      const image = imported
        ? imported.blob
        : await frameToBlob(videoRef.current!);
      await addLog({ point_id: point, image, voice_transcript: transcript.trim() });
      playClick();
      vibrate(80);
      setFlash(true);
      setTimeout(() => setFlash(false), 250);
      setTranscript("");
      clearImport();
      await refreshCount();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-3 max-w-lg mx-auto space-y-3">
      {/* Viewport */}
      <div
        className={`relative aspect-[4/3] bg-card border border-nominal/60 overflow-hidden ${
          flash ? "glitch-once" : ""
        }`}
      >
        {camError && !imported ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <CameraOff className="text-critical" size={28} />
            <p className="text-[10px] tracking-widest text-nominal uppercase">
              {camError}
            </p>
          </div>
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {imported && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imported.url}
              alt="Imported frame"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <button
              onClick={clearImport}
              className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-bg/80 border border-accent text-accent text-[9px] tracking-widest px-2 py-1"
            >
              IMPORTED FRAME <X size={10} />
            </button>
          </>
        )}
        {(camReady || imported) && <Reticle />}
        <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] tracking-[0.3em] bg-bg/70 px-2 py-0.5 text-accent">
          {point}
        </span>
      </div>

      {/* Checkpoint selector */}
      <div className="grid grid-cols-4 gap-2">
        {domain.points.map((p) => (
          <button
            key={p.id}
            onClick={() => setPoint(p.id)}
            className={`py-2 text-[10px] tracking-widest border ${
              point === p.id
                ? "bg-accent text-bg border-accent font-bold"
                : "border-nominal/60 text-nominal hover:text-text"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Transcript terminal */}
      <div className="bg-card border border-nominal/60 p-2">
        <div className="flex items-center justify-between text-[9px] tracking-widest text-nominal mb-1 uppercase">
          <span>Voice log — {point}</span>
          <span className={micState === "recording" ? "text-critical" : ""}>
            {micState === "recording"
              ? "● REC"
              : micState === "transcribing"
                ? "DECODING…"
                : micState === "denied"
                  ? "MIC DENIED — TYPE BELOW"
                  : "HOLD MIC TO SPEAK"}
          </span>
        </div>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={3}
          placeholder="> awaiting observation…"
          className="w-full bg-transparent text-accent text-xs resize-none outline-none placeholder:text-nominal/60"
        />
      </div>

      {/* Actions */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        onChange={onFilePicked}
        className="hidden"
      />
      <div className="grid grid-cols-[auto_1fr_2fr] gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          title="Import a photo or video frame instead of the live camera"
          className="flex items-center justify-center px-4 border border-nominal/60 text-nominal hover:text-accent hover:border-accent"
        >
          <Upload size={16} />
        </button>
        <button
          onPointerDown={micDown}
          onPointerUp={micUp}
          onPointerLeave={() => micState === "recording" && micUp()}
          disabled={micState === "transcribing"}
          className={`flex items-center justify-center gap-2 py-4 border text-xs tracking-widest select-none touch-none ${
            micState === "recording"
              ? "bg-critical text-bg border-critical"
              : "border-accent text-accent active:bg-accent active:text-bg"
          } disabled:opacity-40`}
        >
          <Mic size={16} />
          {micState === "recording" ? "RELEASE" : "HOLD"}
        </button>
        <button
          onClick={logEvent}
          disabled={!canLog}
          className="flex items-center justify-center gap-2 py-4 bg-accent text-bg font-bold text-sm tracking-widest disabled:opacity-40 active:scale-[0.98]"
        >
          {saving ? <Zap size={16} /> : <Camera size={16} />}
          {saving ? "WRITING…" : "LOG EVENT"}
        </button>
      </div>

      <p className="text-center text-[10px] tracking-widest text-nominal uppercase">
        Unprocessed observations:{" "}
        <span className="text-accent">{unprocessed}</span>
      </p>
    </div>
  );
}
