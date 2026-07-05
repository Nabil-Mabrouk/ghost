/// <reference lib="webworker" />
// The brain worker owns all transformers.js models so multi-minute inference
// never touches the UI thread (SPEC.md §2.3).
import {
  AutoProcessor,
  Gemma4ForConditionalGeneration,
  RawImage,
  pipeline,
  type AutomaticSpeechRecognitionPipeline,
} from "@huggingface/transformers";
import type { Engine, MainToWorker, ModelName, WorkerToMain } from "./types";

const WHISPER_MODEL = "onnx-community/whisper-tiny.en";
const GEMMA_MODEL = "onnx-community/gemma-4-E2B-it-ONNX";

type GemmaModel = Awaited<
  ReturnType<typeof Gemma4ForConditionalGeneration.from_pretrained>
>;
type GemmaProcessor = Awaited<ReturnType<typeof AutoProcessor.from_pretrained>>;

let engine: Engine = "wasm";
let whisper: AutomaticSpeechRecognitionPipeline | null = null;
let gemma: GemmaModel | null = null;
let gemmaProcessor: GemmaProcessor | null = null;
let whisperLoading: Promise<void> | null = null;
let gemmaLoading: Promise<void> | null = null;

const post = (msg: WorkerToMain) => self.postMessage(msg);

function progressFor(model: ModelName) {
  return (p: {
    status: string;
    file?: string;
    progress?: number;
    loaded?: number;
    total?: number;
  }) => {
    if (p.status === "progress_total" && p.progress !== undefined) {
      // Aggregated percentage straight from the library.
      post({
        kind: "progress",
        model,
        file: "__total__",
        loaded: Math.round(p.progress),
        total: 100,
      });
    } else if (p.status === "progress" && p.file && p.total) {
      post({
        kind: "progress",
        model,
        file: p.file,
        loaded: p.loaded ?? 0,
        total: p.total,
      });
    }
  };
}

async function ensureWhisper(): Promise<void> {
  if (whisper) return;
  whisperLoading ??= (async () => {
    try {
      whisper = await pipeline("automatic-speech-recognition", WHISPER_MODEL, {
        device: engine,
        dtype:
          engine === "webgpu"
            ? { encoder_model: "fp32", decoder_model_merged: "q4" }
            : "q8",
        progress_callback: progressFor("whisper"),
      });
    } catch (err) {
      if (engine === "webgpu") {
        // WebGPU adapter refused — degrade for this and future loads.
        engine = "wasm";
        post({ kind: "engine", engine });
        whisper = await pipeline(
          "automatic-speech-recognition",
          WHISPER_MODEL,
          {
            device: "wasm",
            dtype: "q8",
            progress_callback: progressFor("whisper"),
          },
        );
      } else {
        throw err;
      }
    }
    post({ kind: "ready", model: "whisper" });
  })();
  try {
    await whisperLoading;
  } catch (err) {
    whisperLoading = null; // allow a retry on the next call
    throw err;
  }
}

async function loadGemma(device: Engine): Promise<void> {
  gemmaProcessor ??= await AutoProcessor.from_pretrained(GEMMA_MODEL, {
    progress_callback: progressFor("gemma"),
  });
  gemma = await Gemma4ForConditionalGeneration.from_pretrained(GEMMA_MODEL, {
    device,
    dtype: device === "webgpu" ? "q4f16" : "q4",
    progress_callback: progressFor("gemma"),
  });
}

async function ensureGemma(): Promise<void> {
  if (gemma) return;
  gemmaLoading ??= (async () => {
    try {
      await loadGemma(engine);
    } catch (err) {
      if (engine === "webgpu") {
        engine = "wasm";
        post({ kind: "engine", engine });
        await loadGemma("wasm");
      } else {
        throw err;
      }
    }
    post({ kind: "ready", model: "gemma" });
  })();
  try {
    await gemmaLoading;
  } catch (err) {
    gemmaLoading = null;
    throw err;
  }
}

async function transcribe(audio: Float32Array): Promise<string> {
  await ensureWhisper();
  const out = await whisper!(audio);
  const text = Array.isArray(out) ? out[0]?.text : out.text;
  return (text ?? "").trim();
}

interface ChatMessage {
  role: string;
  content: { type: string; text?: string }[];
}

async function runGemma(
  messages: ChatMessage[],
  image: RawImage | null,
  maxTokens: number,
): Promise<string> {
  await ensureGemma();
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const proc = gemmaProcessor as any;
  const prompt = proc.apply_chat_template(messages, {
    enable_thinking: false,
    add_generation_prompt: true,
  });
  // Signature is (text, images, audio, options) — nulls must be explicit or
  // the options object is read as audio input.
  const inputs = await proc(prompt, image, null, { add_special_tokens: false });
  const outputs = await (gemma as any).generate({
    ...inputs,
    max_new_tokens: maxTokens,
    do_sample: false,
  });
  const decoded = proc.batch_decode(
    outputs.slice(null, [inputs.input_ids.dims.at(-1), null]),
    { skip_special_tokens: true },
  );
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return String(decoded[0] ?? "").trim();
}

async function caption(image: Blob, prompt: string): Promise<string> {
  const raw = await RawImage.fromBlob(image);
  return runGemma(
    [
      {
        role: "user",
        content: [{ type: "image" }, { type: "text", text: prompt }],
      },
    ],
    raw,
    200,
  );
}

async function analyse(prompt: string): Promise<string> {
  return runGemma(
    [{ role: "user", content: [{ type: "text", text: prompt }] }],
    null,
    300,
  );
}

self.onmessage = async (e: MessageEvent<MainToWorker>) => {
  const msg = e.data;
  try {
    switch (msg.kind) {
      case "init":
        engine = msg.engine;
        post({ kind: "engine", engine });
        break;
      case "ensure":
        if (msg.model === "whisper") await ensureWhisper();
        else await ensureGemma();
        post({ kind: "result", reqId: msg.reqId, payload: "ok" });
        break;
      case "transcribe":
        post({
          kind: "result",
          reqId: msg.reqId,
          payload: await transcribe(msg.audio),
        });
        break;
      case "caption":
        post({
          kind: "result",
          reqId: msg.reqId,
          payload: await caption(msg.image, msg.prompt),
        });
        break;
      case "analyse":
        post({
          kind: "result",
          reqId: msg.reqId,
          payload: await analyse(msg.prompt),
        });
        break;
    }
  } catch (err) {
    post({
      kind: "error",
      reqId: "reqId" in msg ? msg.reqId : undefined,
      message: err instanceof Error ? err.message : String(err),
    });
  }
};
