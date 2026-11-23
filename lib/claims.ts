// Finds promotional claims (numbers, "#1", "best", "guaranteed", "100%") and
// checks each one against the Approved Facts list.
//   approved + current  -> fine
//   approved but expired -> "outdated fact" (cites the fact)
//   not approved         -> "unsupported claim" (cites the claims rule)
// Owner: Member 2
import type { Brand, Fact, Finding } from "./types";
import { findRule, RULE_PATTERNS } from "./ruleLookup";

type Pattern = { re: RegExp; kind: "guarantee" | "superlative" | "number" };

const PATTERNS: Pattern[] = [
  { re: /\bguarantee[ds]?\b/gi, kind: "guarantee" },
  { re: /\b100\s?%/g, kind: "guarantee" },
  { re: /(?:\bthe\s+)?#\s?1\b/gi, kind: "superlative" },
  { re: /(?:\bthe\s+)?\bnumber one\b/gi, kind: "superlative" },
  { re: /(?:\bthe\s+)?\b(?:best|fastest|cheapest|leading|top-rated|most trusted)\b/gi, kind: "superlative" },
  {
    re: /\b\d[\d,]*(?:\.\d+)?\s?(?:\+|%|k\b|lakh\b|crore\b|(?:star\s)?rating\b|stars?\b|learners\b|users\b|students\b|colleges\b|companies\b)/gi,
    kind: "number",
  },
];

// softer words to suggest instead of superlatives
const SOFTER: Record<string, string> = {
  "#1": "trusted",
  "# 1": "trusted",
  "number one": "trusted",
  best: "great",
  fastest: "fast",
  cheapest: "most affordable",
  leading: "growing",
  "top-rated": "well-rated",
  "most trusted": "trusted",
};

// "the best app" -> "a great app"; "India's #1 app" -> "India's trusted app"
function soften(span: string): string | null {
  const hasThe = /^the\s+/i.test(span);
  const word = span.replace(/^the\s+/i, "").toLowerCase().replace(/\s+/g, " ");
  const soft = SOFTER[word];
  if (!soft) return null;
  if (!hasThe) return soft;
  const article = soft.startsWith("most") ? "the" : /^[aeiou]/.test(soft) ? "an" : "a";
  const out = `${article} ${soft}`;
  return span[0] === span[0].toUpperCase() ? out[0].toUpperCase() + out.slice(1) : out;
}

const today = () => new Date().toISOString().slice(0, 10);
const norm = (s: string) => s.toLowerCase().replace(/,/g, "");

function findFact(claim: string, facts: Fact[]): Fact | undefined {
  const digits = claim.replace(/[^\d.]/g, "").replace(/\.$/, "");
  if (digits) {
    const re = new RegExp(`(^|[^\\d.])${digits.replace(/\./g, "\\.")}([^\\d]|$)`);
    return facts.find((f) => re.test(norm(f.claim)));
  }
  return facts.find((f) => norm(f.claim).includes(norm(claim)));
}

export function claimChecks(content: string, brand: Brand): Finding[] {
  const findings: Finding[] = [];
  // this brand's rules for claims (if a brand has none, that kind of finding is skipped)
  const claimsRule = findRule(brand, RULE_PATTERNS.approvedClaims);
  const guaranteeRule = findRule(brand, RULE_PATTERNS.guarantee) ?? claimsRule;
  const superlativeRule = findRule(brand, RULE_PATTERNS.superlative) ?? claimsRule;
  const seen = new Set<string>();

  for (const { re, kind } of PATTERNS) {
    for (const m of content.matchAll(re)) {
      const span = m[0].trim();
      const key = `${m.index}:${span}`;
      if (seen.has(key)) continue;
      seen.add(key);

      // "100%" inside a number match is already handled by the guarantee pattern
      if (kind === "number" && /^100\s?%$/.test(span)) continue;

      const fact = kind === "guarantee" ? undefined : findFact(span, brand.facts);

      if (fact && fact.expires_on >= today()) continue; // approved and current

      if (fact) {
        findings.push({
          source: "rule",
          category: "fact",
          severity: "blocker",
          span_text: span,
          rule_id: null,
          fact_id: fact.id,
          explanation: `"${fact.claim}" was approved, but it expired on ${fact.expires_on}. Outdated figures can mislead people.`,
          suggested_fix: null,
          confidence: 1,
        });
        continue;
      }

      if (kind === "guarantee") {
        if (!guaranteeRule) continue;
        findings.push({
          source: "rule",
          category: "claim",
          severity: "blocker",
          span_text: span,
          rule_id: guaranteeRule.id,
          fact_id: null,
          explanation: "We never promise guaranteed or 100% results. This kind of claim can be misleading and risky.",
          suggested_fix: null, // the AI suggests a rewrite that fits the sentence (see orchestrator)
          confidence: 1,
        });
      } else if (kind === "superlative") {
        if (!superlativeRule) continue;
        findings.push({
          source: "rule",
          category: "claim",
          severity: "blocker",
          span_text: span,
          rule_id: superlativeRule.id,
          fact_id: null,
          explanation: `"${span}" is a superlative claim with no approved fact behind it.`,
          suggested_fix: soften(span),
          confidence: 1,
        });
      } else {
        if (!claimsRule) continue;
        findings.push({
          source: "rule",
          category: "claim",
          severity: "blocker",
          span_text: span,
          rule_id: claimsRule.id,
          fact_id: null,
          explanation: `"${span}" is not in our Approved Facts list, so we can't publish it.`,
          suggested_fix: null,
          confidence: 1,
        });
      }
    }
  }
  return findings;
}
