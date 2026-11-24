// Finds rules in a rulebook that contradict each other (e.g. "always formal" vs "keep it casual").
// Every reported pair is checked in code: both rule ids must really exist.
// Owner: Member 1
import { Type } from "@google/genai";
import { callGeminiJSON } from "./gemini";
import type { Conflict } from "./types";

const SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      rule_a: { type: Type.STRING },
      rule_b: { type: Type.STRING },
      explanation: { type: Type.STRING },
      suggestion: { type: Type.STRING },
    },
    required: ["rule_a", "rule_b", "explanation", "suggestion"],
  },
};

export async function findConflicts(rules: { id: string; text: string }[]): Promise<Conflict[]> {
  if (rules.length < 2) return [];

  const prompt = `Below is a brand's rulebook. Find pairs of rules that CONTRADICT each other —
a writer could not follow both at the same time (e.g. "Always use formal language" vs "Use friendly, casual language";
"Never use emojis" vs "Use at least two emojis per post").
Do NOT report rules that are merely related, overlapping or about different channels unless they truly clash.
For each pair: rule_a and rule_b are the rule ids, explanation is one plain sentence on why they clash,
suggestion is one clear way to resolve it (e.g. which to keep, or a rewritten combined rule).
Return an empty list if there are no real contradictions.

RULES:
${rules.map((r) => `${r.id}: ${r.text}`).join("\n")}`;

  const raw = (await callGeminiJSON<Conflict[]>(prompt, SCHEMA, { timeoutMs: 35000 })) ?? [];
  return validateConflicts(raw, rules);
}

export function validateConflicts(raw: Conflict[], rules: { id: string }[]): Conflict[] {
  const ids = new Set(rules.map((r) => r.id));
  const seen = new Set<string>();
  return raw
    .map((c) => ({ ...c, rule_a: String(c.rule_a ?? "").trim().toUpperCase(), rule_b: String(c.rule_b ?? "").trim().toUpperCase() }))
    .filter((c) => ids.has(c.rule_a) && ids.has(c.rule_b) && c.rule_a !== c.rule_b)
    .filter((c) => {
      const key = [c.rule_a, c.rule_b].sort().join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 20)
    .map((c) => ({ ...c, explanation: String(c.explanation ?? "").slice(0, 300), suggestion: String(c.suggestion ?? "").slice(0, 300) }));
}
