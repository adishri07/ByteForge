// Turns the text of an uploaded brand guideline into a structured rulebook:
// numbered rules, banned/preferred/competitor words, approved facts, brand colours.
// Nothing here is enforced until a manager approves it.
// Owner: Member 1
import { Type } from "@google/genai";
import { callGeminiJSON } from "./gemini";
import type { ExtractedRuleset, Severity } from "./types";

const MAX_CHARS = 60000;

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    rules: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          category: { type: Type.STRING },
          text: { type: Type.STRING },
          severity: { type: Type.STRING },
        },
        required: ["id", "category", "text", "severity"],
      },
    },
    terms: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          term: { type: Type.STRING },
          type: { type: Type.STRING },
          replacement: { type: Type.STRING, nullable: true },
          rule_id: { type: Type.STRING, nullable: true },
        },
        required: ["term", "type"],
      },
    },
    facts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          claim: { type: Type.STRING },
          source: { type: Type.STRING },
          expires_on: { type: Type.STRING },
        },
        required: ["id", "claim", "source", "expires_on"],
      },
    },
    colors: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { label: { type: Type.STRING }, hex: { type: Type.STRING } },
        required: ["label", "hex"],
      },
    },
  },
  required: ["rules", "terms", "facts", "colors"],
};

const CATEGORIES = ["tone", "terminology", "claims", "readability", "accessibility", "messaging", "visual"];
const SEVERITIES: Severity[] = ["blocker", "warning", "suggestion"];
const TERM_TYPES = ["banned", "competitor", "misspelling", "preferred"] as const;

const pad = (n: number) => String(n).padStart(2, "0");

export async function extractRules(text: string, brandName: string): Promise<ExtractedRuleset> {
  const today = new Date().toISOString().slice(0, 10);
  const nextYear = new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10);

  const prompt = `You convert a company's brand guideline document into a checkable rulebook for "${brandName}".
Today is ${today}. Read the GUIDELINE and return:

rules: every clear, checkable instruction about writing or visuals, one rule per instruction, in your own short words.
  - id: "R-01", "R-02", ... in order
  - category: one of tone, terminology, claims, readability, accessibility, messaging, visual
  - severity: "blocker" for legal/claims/competitor/logo rules, "warning" for voice and wording, "suggestion" for style preferences
  - Include a general claims rule like "Only use numbers and claims from the approved facts list" if the guideline talks about claims or statistics.
  - Write rules about ALL CAPS, exclamation marks, emojis or sentence length explicitly if the guideline mentions them (keep any numbers).
terms: words to avoid ("banned", with the preferred replacement if given), competitor names ("competitor"), wrong spellings of the brand or product names ("misspelling", replacement = correct spelling), preferred words ("preferred"). rule_id = the rule they belong to, if any.
facts: approved claims/statistics the company may publish (numbers, ratings, awards, offers). id "F-01"... source = where the guideline says it comes from (or "Brand guideline"). expires_on = YYYY-MM-DD; if the guideline gives no date use ${nextYear}; if it says the fact is outdated use a past date.
colors: brand colours with a short label and hex code (#RRGGBB). Convert named colours with given RGB/CMYK values to hex. Only colours the guideline actually lists.

Do NOT invent rules, facts, words or colours that are not in the guideline. If something is unclear, leave it out.

GUIDELINE:
"""
${text.slice(0, MAX_CHARS)}
"""`;

  const raw = await callGeminiJSON<ExtractedRuleset>(prompt, SCHEMA, { timeoutMs: 60000 });
  return cleanRuleset(raw);
}

// Renumber and tidy whatever the AI returned, so codes are unique and valid.
export function cleanRuleset(raw: Partial<ExtractedRuleset> | null): ExtractedRuleset {
  const idMap = new Map<string, string>();
  const rules = (raw?.rules ?? [])
    .filter((r) => r && typeof r.text === "string" && r.text.trim().length > 3)
    .slice(0, 60)
    .map((r, i) => {
      const id = `R-${pad(i + 1)}`;
      if (r.id) idMap.set(String(r.id).trim().toUpperCase(), id);
      const cat = String(r.category ?? "").toLowerCase();
      return {
        id,
        category: CATEGORIES.includes(cat) ? cat : "messaging",
        text: r.text.trim().slice(0, 300),
        severity: SEVERITIES.includes(r.severity as Severity) ? (r.severity as Severity) : "warning",
      };
    });

  const seenTerms = new Set<string>();
  const terms = (raw?.terms ?? [])
    .filter((t) => t && typeof t.term === "string" && t.term.trim().length > 1 && TERM_TYPES.includes(t.type as (typeof TERM_TYPES)[number]))
    .filter((t) => {
      const key = `${t.type}:${t.term.trim().toLowerCase()}`;
      if (seenTerms.has(key)) return false;
      seenTerms.add(key);
      return true;
    })
    .slice(0, 100)
    .map((t) => ({
      term: t.term.trim().slice(0, 60),
      type: t.type,
      replacement: t.replacement?.trim() ? t.replacement.trim().slice(0, 60) : null,
      rule_id: t.rule_id ? idMap.get(String(t.rule_id).trim().toUpperCase()) ?? null : null,
    }));

  const facts = (raw?.facts ?? [])
    .filter((f) => f && typeof f.claim === "string" && f.claim.trim().length > 1)
    .slice(0, 50)
    .map((f, i) => ({
      id: `F-${pad(i + 1)}`,
      claim: f.claim.trim().slice(0, 200),
      source: (f.source ?? "Brand guideline").toString().trim().slice(0, 120) || "Brand guideline",
      expires_on: /^\d{4}-\d{2}-\d{2}$/.test(f.expires_on ?? "") ? f.expires_on : new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10),
    }));

  const colors = (raw?.colors ?? [])
    .map((c) => ({ label: (c?.label ?? "").toString().trim().slice(0, 40), hex: normaliseHex(c?.hex) }))
    .filter((c): c is { label: string; hex: string } => !!c.hex)
    .slice(0, 12);

  return { rules, terms, facts, colors };
}

export function normaliseHex(v: unknown): string | null {
  const s = String(v ?? "").trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(s)) return `#${s.split("").map((c) => c + c).join("").toUpperCase()}`;
  if (/^[0-9a-f]{6}$/i.test(s)) return `#${s.toUpperCase()}`;
  return null;
}
