// "Ask BrandProof": answers brand questions ONLY from the brand's own rulebook.
// Every cited rule/fact id is checked in code; an answer with no valid citation
// is marked "not covered" instead of being presented as a rule.
// Owner: Member 1
import { Type } from "@google/genai";
import { callGeminiJSON } from "./gemini";
import type { Brand, ChatAnswer } from "./types";

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    answer: { type: Type.STRING },
    covered: { type: Type.BOOLEAN },
    citations: { type: Type.ARRAY, items: { type: Type.STRING } },
    rewrite: { type: Type.STRING, nullable: true },
  },
  required: ["answer", "covered", "citations"],
};

export type ChatTurn = { role: "user" | "assistant"; content: string };

export async function answerQuestion(message: string, history: ChatTurn[], brand: Brand): Promise<ChatAnswer> {
  const today = new Date().toISOString().slice(0, 10);
  const recent = history.slice(-6).map((t) => `${t.role === "user" ? "User" : "Assistant"}: ${t.content.slice(0, 600)}`).join("\n");

  const prompt = `You are "Ask BrandProof", the brand assistant for ${brand.name}. Today is ${today}.
Answer the user's question using ONLY the RULES and APPROVED FACTS below — never general knowledge or guesses about the brand.

- Cite every rule or fact you rely on by its id in "citations" (e.g. ["R-10","F-01"]), and mention them in the answer like (R-10).
- If an approved fact has expired (expiry date before today), say it can no longer be used.
- If the rulebook does not answer the question, set covered=false, citations=[], and say clearly that the rulebook doesn't cover it and they should ask their brand manager. Do not guess.
- If the user asks you to write or rewrite content, put the on-brand version in "rewrite" (only text that follows every rule and uses only approved facts); otherwise rewrite = null.
- Keep the answer short: 1-4 sentences, plain English.

RULES:
${brand.rules.map((r) => `${r.id} [${r.category}, ${r.severity}]: ${r.text}`).join("\n") || "(none)"}

APPROVED FACTS:
${brand.facts.map((f) => `${f.id}: ${f.claim} (expires ${f.expires_on})`).join("\n") || "(none)"}

WORDS: ${brand.terms.map((t) => `${t.term} (${t.type}${t.replacement ? ` → ${t.replacement}` : ""})`).join("; ") || "(none)"}

${recent ? `CONVERSATION SO FAR:\n${recent}\n` : ""}
QUESTION: ${message}`;

  const raw = await callGeminiJSON<ChatAnswer>(prompt, SCHEMA, { timeoutMs: 25000 });
  return validateAnswer(raw, brand);
}

export function validateAnswer(raw: Partial<ChatAnswer> | null, brand: Brand): ChatAnswer {
  const valid = new Set([...brand.rules.map((r) => r.id), ...brand.facts.map((f) => f.id)]);
  const citations = [...new Set((raw?.citations ?? []).map((c) => String(c).trim().toUpperCase()))].filter((c) => valid.has(c));
  let answer = String(raw?.answer ?? "").trim().slice(0, 1500);
  let covered = !!raw?.covered && citations.length > 0;
  if (!answer) {
    answer = "Sorry, I couldn't work that out. Please try asking in a different way.";
    covered = false;
  }
  if (raw?.covered && citations.length === 0) {
    answer += " (I couldn't link this to a specific rule in your rulebook, so please check with your brand manager.)";
  }
  const rewrite = raw?.rewrite && String(raw.rewrite).trim() ? String(raw.rewrite).trim().slice(0, 2000) : null;
  return { answer, covered, citations: covered ? citations : [], rewrite };
}
