// Finds which of a brand's rules covers a built-in check (ALL CAPS, emojis, claims...),
// so the code checks cite the right rule for ANY brand, not only the demo brand.
// If a brand has no such rule, that check is simply skipped.
// Owner: Member 2
import type { Brand, Rule } from "./types";

export function findRule(brand: Brand, patterns: RegExp[]): Rule | null {
  for (const p of patterns) {
    const r = brand.rules.find((rule) => p.test(rule.text));
    if (r) return r;
  }
  return null;
}

export const RULE_PATTERNS = {
  allCaps: [/all[\s-]*caps/i, /capital letters/i, /uppercase/i],
  exclamation: [/exclamation/i, /!{2,}/],
  emoji: [/emoji/i],
  sentenceLength: [/sentence[s]?.*\b\d+\s*words?\b/i, /\b\d+\s*words?\b.*sentence/i, /sentence length/i, /short sentences/i],
  approvedClaims: [/approved (facts|claims|statistics)/i, /only (use|publish|quote).*(numbers|statistics|claims|facts)/i, /unverified (claims|numbers)/i, /statistic/i],
  guarantee: [/guarantee/i, /100\s?%/i, /promise.*(result|outcome|job)/i],
  superlative: [/superlative/i, /#1|number one|best|fastest|leading/i],
  visualPalette: [/brand colou?rs?/i, /colou?r palette/i, /approved colou?rs?/i],
  visualLogo: [/logo/i],
  visualContrast: [/contrast/i],
  visualAltText: [/alt[\s-]?text/i, /alternative text/i],
};

// "Keep sentences under 30 words" -> 30
export function numberIn(rule: Rule | null, fallback: number): number {
  const m = rule?.text.match(/\b(\d{1,3})\b/);
  const n = m ? Number(m[1]) : NaN;
  return Number.isFinite(n) && n > 0 && n < 200 ? n : fallback;
}
