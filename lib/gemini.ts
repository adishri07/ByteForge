// One shared way to call Gemini with a strict JSON answer, a time limit, and optional images.
// If Google is busy (503 / 429 / overloaded) it waits and retries, then tries a backup model,
// all inside the same total time limit.
// Owner: Member 1
import { GoogleGenAI } from "@google/genai";

const PRIMARY = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
// Backup models, tried only when the main one is busy or unavailable. Set GEMINI_FALLBACK_MODELS
// in Vercel (comma-separated) to change them; models your key can't use are skipped automatically.
const FALLBACKS = (process.env.GEMINI_FALLBACK_MODELS || "gemini-2.5-flash-lite,gemini-2.5-flash")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);
const MODELS = [...new Set([PRIMARY, ...FALLBACKS])];

let client: GoogleGenAI | null = null;

function getClient() {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

export type InlineImage = { mimeType: string; base64: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Google is busy or rate-limiting: worth waiting and trying again.
function isBusy(err: unknown) {
  const s = String((err as { message?: string })?.message ?? err);
  return /\b(503|429|500)\b|UNAVAILABLE|RESOURCE_EXHAUSTED|overloaded|high demand|INTERNAL/i.test(s);
}
// This model doesn't exist for this key: skip straight to the next model.
function isMissingModel(err: unknown) {
  const s = String((err as { message?: string })?.message ?? err);
  return /\b404\b|NOT_FOUND|not found|is not supported/i.test(s);
}

export async function callGeminiJSON<T>(
  prompt: string,
  schema: object,
  opts: { images?: InlineImage[]; timeoutMs?: number; temperature?: number } = {}
): Promise<T> {
  const parts: object[] = (opts.images ?? []).map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.base64 } }));
  parts.push({ text: prompt });

  const budget = opts.timeoutMs ?? 30000; // total time for all attempts together
  const deadline = Date.now() + budget;
  let lastErr: unknown = new Error("Gemini was not called");

  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const left = deadline - Date.now();
      if (left < 3000) throw new Error(`Gemini timed out after ${budget / 1000}s (last error: ${String(lastErr)})`);
      try {
        const request = getClient().models.generateContent({
          model,
          contents: [{ role: "user", parts }],
          config: {
            temperature: opts.temperature ?? 0,
            responseMimeType: "application/json",
            responseSchema: schema,
          },
        } as Parameters<GoogleGenAI["models"]["generateContent"]>[0]);
        const res = await Promise.race([
          request,
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Gemini timed out after ${Math.round(left / 1000)}s`)), left)),
        ]);
        if (model !== PRIMARY) console.warn(`Gemini: answered by backup model ${model}`);
        return JSON.parse(res.text ?? "null") as T;
      } catch (err) {
        lastErr = err;
        if (isMissingModel(err)) break; // try the next model
        if (!isBusy(err)) throw err; // a real error (bad request etc.): don't hide it
        console.warn(`Gemini busy on ${model} (attempt ${attempt + 1}): ${String((err as Error)?.message ?? err).slice(0, 120)}`);
        await sleep(Math.min(attempt === 0 ? 1200 : 2500, Math.max(0, deadline - Date.now() - 3000)));
      }
    }
  }
  throw lastErr;
}
