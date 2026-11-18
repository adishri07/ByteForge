// Asks Gemini to review a draft against the brand rules and facts.
// Owner: Member 1
import { GoogleGenAI, Type } from "@google/genai";
import type { Brand, Finding } from "./types";

let client: GoogleGenAI | null = null;
function getClient() {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export async function aiReview(content: string, channel: string, brand: Brand): Promise<Finding[]> {
  const today = new Date().toISOString().slice(0, 10);

  const prompt = `You are a careful brand compliance reviewer for BrightPath Learning, an online learning app.
Review the DRAFT only against the RULES and APPROVED FACTS below. Today is ${today}.

Focus on things simple word-matching cannot catch:
- tone and brand voice (pushy, fear-based, sarcastic, slang, too casual for the channel)
- messaging (attacking competitors, off-brand promises)
- misleading or unsupported claims that are not in the approved facts
- accessibility in the wording (e.g. "click the green button" relies on colour)

Strict rules for your answer:
1. Report an issue ONLY if you can cite a rule_id or fact_id from the lists below.
2. span_text must be copied EXACTLY, character for character, from the draft (a few words, not the whole draft).
3. suggested_fix must replace ONLY span_text, keep the writer's meaning, and follow the rules.
4. explanation is one short, plain-English sentence.
5. severity must be "blocker", "warning" or "suggestion" (use the rule's severity).
6. category must be one of: tone, terminology, claim, fact, readability, accessibility, messaging.
7. If the draft follows all rules, return an empty list.

CHANNEL: ${channel}

RULES:
${brand.rules.map((r) => `${r.id} [${r.category}, ${r.severity}]: ${r.text}`).join("\n")}

APPROVED FACTS (the only claims allowed):
${brand.facts.map((f) => `${f.id}: ${f.claim} (expires ${f.expires_on})`).join("\n")}

DRAFT:
"""
${content}
"""`;

  const res = await getClient().models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            severity: { type: Type.STRING },
            span_text: { type: Type.STRING },
            rule_id: { type: Type.STRING, nullable: true },
            fact_id: { type: Type.STRING, nullable: true },
            explanation: { type: Type.STRING },
            suggested_fix: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
          },
          required: ["category", "severity", "span_text", "explanation", "suggested_fix"],
        },
      },
    },
  });

  const items = JSON.parse(res.text ?? "[]") as Partial<Finding>[];
  return items.map((f) => ({
    source: "ai",
    category: (f.category ?? "tone") as Finding["category"],
    severity: (f.severity ?? "warning") as Finding["severity"],
    span_text: f.span_text ?? "",
    rule_id: f.rule_id || null,
    fact_id: f.fact_id || null,
    explanation: f.explanation ?? "",
    suggested_fix: f.suggested_fix ?? null,
    confidence: typeof f.confidence === "number" ? f.confidence : 0.8,
  }));
}
