// One shared way to call Gemini with a strict JSON answer, a time limit, and optional images.
// Owner: Member 1
import { GoogleGenAI } from "@google/genai";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
let client: GoogleGenAI | null = null;

function getClient() {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

export type InlineImage = { mimeType: string; base64: string };

export async function callGeminiJSON<T>(
  prompt: string,
  schema: object,
  opts: { images?: InlineImage[]; timeoutMs?: number; temperature?: number } = {}
): Promise<T> {
  const parts: object[] = (opts.images ?? []).map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.base64 } }));
  parts.push({ text: prompt });

  const request = getClient().models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts }],
    config: {
      temperature: opts.temperature ?? 0,
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  } as Parameters<GoogleGenAI["models"]["generateContent"]>[0]);

  const timeoutMs = opts.timeoutMs ?? 30000;
  const res = await Promise.race([
    request,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Gemini timed out after ${timeoutMs / 1000}s`)), timeoutMs)),
  ]);
  return JSON.parse(res.text ?? "null") as T;
}
