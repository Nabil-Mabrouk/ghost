"use client";

// Camera frame + microphone capture helpers (SPEC.md §1.1).

/** Center-crop any drawable source to 4:3 and encode as JPEG. */
function cropToJpeg(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  width = 1024,
  quality = 0.8,
): Promise<Blob> {
  const height = Math.round((width * 3) / 4);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const targetRatio = 4 / 3;
  let cropW = srcW;
  let cropH = srcH;
  if (srcW / srcH > targetRatio) cropW = Math.round(srcH * targetRatio);
  else cropH = Math.round(srcW / targetRatio);
  const cropX = Math.round((srcW - cropW) / 2);
  const cropY = Math.round((srcH - cropH) / 2);

  ctx.drawImage(source, cropX, cropY, cropW, cropH, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      quality,
    );
  });
}

/** Grab the current live camera frame. */
export function frameToBlob(
  video: HTMLVideoElement,
  width = 1024,
  quality = 0.8,
): Promise<Blob> {
  return cropToJpeg(video, video.videoWidth, video.videoHeight, width, quality);
}

/**
 * Import an observation from a file instead of the live camera: image files
 * are normalized (4:3 crop, JPEG), video files contribute a single frame
 * (~1s in, or the middle of very short clips).
 */
export async function fileToBlob(file: File): Promise<Blob> {
  if (file.type.startsWith("image/")) {
    const bitmap = await createImageBitmap(file);
    try {
      return await cropToJpeg(bitmap, bitmap.width, bitmap.height);
    } finally {
      bitmap.close();
    }
  }
  if (file.type.startsWith("video/")) {
    const url = URL.createObjectURL(file);
    try {
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.src = url;
      await new Promise<void>((res, rej) => {
        video.onloadedmetadata = () => res();
        video.onerror = () => rej(new Error("video load failed"));
      });
      video.currentTime = Math.min(1, video.duration / 2);
      await new Promise<void>((res, rej) => {
        video.onseeked = () => res();
        video.onerror = () => rej(new Error("video seek failed"));
      });
      return await cropToJpeg(video, video.videoWidth, video.videoHeight);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  throw new Error(`unsupported file type: ${file.type || "unknown"}`);
}

export interface AudioRecording {
  /** Stops the recorder and resolves to 16kHz mono PCM (Whisper's format). */
  stop: () => Promise<Float32Array>;
  cancel: () => void;
}

export async function startAudioRecording(): Promise<AudioRecording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.start();

  const teardown = () => stream.getTracks().forEach((t) => t.stop());

  return {
    cancel: () => {
      if (recorder.state !== "inactive") recorder.stop();
      teardown();
    },
    stop: () =>
      new Promise<Float32Array>((resolve, reject) => {
        recorder.onstop = async () => {
          teardown();
          try {
            const blob = new Blob(chunks, { type: recorder.mimeType });
            const buf = await blob.arrayBuffer();
            // decodeAudioData resamples to the context rate: 16kHz for Whisper.
            const ctx = new AudioContext({ sampleRate: 16000 });
            const decoded = await ctx.decodeAudioData(buf);
            const pcm = decoded.getChannelData(0).slice();
            await ctx.close();
            resolve(pcm);
          } catch (err) {
            reject(err);
          }
        };
        recorder.onerror = () => {
          teardown();
          reject(new Error("audio recording failed"));
        };
        recorder.stop();
      }),
  };
}
