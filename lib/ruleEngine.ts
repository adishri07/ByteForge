// Rule checks that don't need AI: banned words, competitor names, brand-name
// spelling, ALL CAPS, too many "!!!", too many emojis, very long sentences.
// Owner: Member 2
import type { Brand, Finding } from "./types";
import { findRule, numberIn, RULE_PATTERNS } from "./ruleLookup";

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// keep "Clients" -> "Learners" capitalised like the original
function matchCase(original: string, replacement: string) {
  if (!replacement) return replacement;
  if (original[0] === original[0].toUpperCase() && original[0] !== original[0].toLowerCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

function ruleText(brand: Brand, id: string) {
  return brand.rules.find((r) => r.id === id)?.text ?? "";
}

export function ruleChecks(content: string, brand: Brand): Finding[] {
  const findings: Finding[] = [];
  // which of THIS brand's rules covers each built-in check (null = brand has no such rule, skip it)
  const capsRule = findRule(brand, RULE_PATTERNS.allCaps);
  const exclRule = findRule(brand, RULE_PATTERNS.exclamation);
  const emojiRule = findRule(brand, RULE_PATTERNS.emoji);
  const lengthRule = findRule(brand, RULE_PATTERNS.sentenceLength);

  // every finding must cite an ACTIVE rule: use the word's own rule, else the brand's first terminology rule
  const activeIds = new Set(brand.rules.map((r) => r.id));
  const fallbackTermRule = brand.rules.find((r) => r.category === "terminology")?.id ?? null;
  const termRule = (ruleId: string | null) => (ruleId && activeIds.has(ruleId) ? ruleId : fallbackTermRule);

  // 1. Banned words and competitor names (case-insensitive, whole words)
  for (const t of brand.terms.filter((t) => t.type === "banned" || t.type === "competitor")) {
    const ruleId = termRule(t.rule_id);
    if (!ruleId) continue;
    const re = new RegExp(`\\b${escape(t.term)}\\b`, "gi");
    for (const m of content.matchAll(re)) {
      // include a preceding "a"/"an" so "a cheap plan" -> "an affordable plan"
      const before = content.slice(0, m.index).match(/\b(an?)\s+$/i);
      let span = m[0];
      let fix: string | null = t.replacement
        ? t.type === "banned" ? matchCase(m[0], t.replacement) : t.replacement // competitor names: keep replacement as written
        : null;
      if (before && fix && t.type === "banned") {
        span = before[0] + m[0];
        const article = /^[aeiou]/i.test(fix) ? "an" : "a";
        fix = `${before[1][0] === "A" ? article[0].toUpperCase() + article.slice(1) : article} ${fix}`;
      }
      findings.push({
        source: "rule",
        category: "terminology",
        severity: t.type === "competitor" ? "blocker" : "warning",
        span_text: span,
        rule_id: ruleId,
        fact_id: null,
        explanation:
          t.type === "competitor"
            ? `Our guidelines don't allow naming competitors like "${m[0]}". ${ruleText(brand, ruleId)}`
            : `"${m[0]}" is not one of our brand words. ${ruleText(brand, ruleId)}`,
        suggested_fix: fix,
        confidence: 1,
      });
    }
  }

  // 2. Brand-name misspellings (case-sensitive, e.g. "Brightpath" -> "BrightPath")
  for (const t of brand.terms.filter((t) => t.type === "misspelling")) {
    const ruleId = termRule(t.rule_id);
    if (!ruleId || !t.replacement || t.replacement === t.term) continue;
    const re = new RegExp(`\\b${escape(t.term)}\\b`, "g");
    for (const m of content.matchAll(re)) {
      findings.push({
        source: "rule",
        category: "terminology",
        severity: "warning",
        span_text: m[0],
        rule_id: ruleId,
        fact_id: null,
        explanation: `The brand name is spelled "${t.replacement}".`,
        suggested_fix: t.replacement,
        confidence: 1,
      });
    }
  }

  // 3. ALL CAPS words
  if (capsRule) {
    const allowed = new Set(["AI", "IIT", "JEE", "NEET", "UPSC", "CBSE", "ICSE", "SQL", "HTML", "CSS", "API", "FAQ", "PDF"]);
    for (const m of content.matchAll(/\b[A-Z]{4,}\b/g)) {
      if (allowed.has(m[0])) continue;
      findings.push({
        source: "rule",
        category: "tone",
        severity: "suggestion",
        span_text: m[0],
        rule_id: capsRule.id,
        fact_id: null,
        explanation: "Writing in ALL CAPS feels like shouting, which our brand avoids.",
        suggested_fix: m[0][0] + m[0].slice(1).toLowerCase(),
        confidence: 1,
      });
    }
  }

  // 4. More than one "!" in a row
  if (exclRule) {
    for (const m of content.matchAll(/!{2,}/g)) {
      findings.push({
        source: "rule",
        category: "tone",
        severity: "suggestion",
        span_text: m[0],
        rule_id: exclRule.id,
        fact_id: null,
        explanation: "Use at most one exclamation mark; more feels pushy.",
        suggested_fix: "!",
        confidence: 1,
      });
    }
  }

  // 5. Too many emojis in the post (limit taken from the rule text, default 2)
  if (emojiRule) {
    const limit = numberIn(emojiRule, 2);
    let budget = limit;
    for (const m of content.matchAll(/(?:\p{Extended_Pictographic}️?)+/gu)) {
      const emojis = m[0].match(/\p{Extended_Pictographic}️?/gu) ?? [];
      const keep = Math.min(budget, emojis.length);
      budget -= keep;
      if (emojis.length > keep) {
        findings.push({
          source: "rule",
          category: "tone",
          severity: "suggestion",
          span_text: m[0],
          rule_id: emojiRule.id,
          fact_id: null,
          explanation: `Our posts use at most ${limit} emoji${limit === 1 ? "" : "s"} in total.`,
          suggested_fix: emojis.slice(0, keep).join(""),
          confidence: 1,
        });
      }
    }
  }

  // 6. Very long sentences (limit taken from the rule text, default 30) — no automatic fix
  if (lengthRule) {
    const maxWords = numberIn(lengthRule, 30);
    const sentences = content.match(/[^.!?\n]+[.!?]?/g) ?? [];
    for (const s of sentences) {
      const words = s.trim().split(/\s+/).filter(Boolean);
      if (words.length > maxWords) {
        findings.push({
          source: "rule",
          category: "readability",
          severity: "suggestion",
          span_text: s.trim(),
          rule_id: lengthRule.id,
          fact_id: null,
          explanation: `This sentence has ${words.length} words. Keep sentences under ${maxWords} words so they're easy to read.`,
          suggested_fix: null,
          confidence: 1,
        });
      }
    }
  }

  return findings;
}
