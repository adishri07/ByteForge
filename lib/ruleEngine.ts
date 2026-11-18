// Rule checks that don't need AI: banned words, competitor names, brand-name
// spelling, ALL CAPS, too many "!!!", too many emojis, very long sentences.
// Owner: Member 2
import type { Brand, Finding } from "./types";

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
  const has = (id: string) => brand.rules.some((r) => r.id === id);

  // 1. Banned words and competitor names (case-insensitive, whole words)
  for (const t of brand.terms.filter((t) => t.type === "banned" || t.type === "competitor")) {
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
        rule_id: t.rule_id,
        fact_id: null,
        explanation:
          t.type === "competitor"
            ? `Our guidelines don't allow naming competitors like "${m[0]}". ${ruleText(brand, t.rule_id ?? "")}`
            : `"${m[0]}" is not a BrightPath word. ${ruleText(brand, t.rule_id ?? "")}`,
        suggested_fix: fix,
        confidence: 1,
      });
    }
  }

  // 2. Brand-name misspellings (case-sensitive, e.g. "Brightpath" -> "BrightPath")
  for (const t of brand.terms.filter((t) => t.type === "misspelling")) {
    const re = new RegExp(`\\b${escape(t.term)}\\b`, "g");
    for (const m of content.matchAll(re)) {
      findings.push({
        source: "rule",
        category: "terminology",
        severity: "warning",
        span_text: m[0],
        rule_id: t.rule_id,
        fact_id: null,
        explanation: `The brand name is spelled "${t.replacement}".`,
        suggested_fix: t.replacement,
        confidence: 1,
      });
    }
  }

  // 3. ALL CAPS words (R-11)
  if (has("R-11")) {
    const allowed = new Set(["AI", "IIT", "JEE", "NEET", "UPSC", "CBSE", "ICSE", "SQL", "HTML", "CSS", "API", "FAQ", "PDF"]);
    for (const m of content.matchAll(/\b[A-Z]{4,}\b/g)) {
      if (allowed.has(m[0])) continue;
      findings.push({
        source: "rule",
        category: "tone",
        severity: "suggestion",
        span_text: m[0],
        rule_id: "R-11",
        fact_id: null,
        explanation: "Writing in ALL CAPS feels like shouting, which our brand avoids.",
        suggested_fix: m[0][0] + m[0].slice(1).toLowerCase(),
        confidence: 1,
      });
    }
  }

  // 4. More than one "!" in a row (R-12)
  if (has("R-12")) {
    for (const m of content.matchAll(/!{2,}/g)) {
      findings.push({
        source: "rule",
        category: "tone",
        severity: "suggestion",
        span_text: m[0],
        rule_id: "R-12",
        fact_id: null,
        explanation: "Use at most one exclamation mark; more feels pushy.",
        suggested_fix: "!",
        confidence: 1,
      });
    }
  }

  // 5. More than 2 emojis in the post (R-13)
  if (has("R-13")) {
    let budget = 2;
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
          rule_id: "R-13",
          fact_id: null,
          explanation: "Our posts use at most 2 emojis in total.",
          suggested_fix: emojis.slice(0, keep).join(""),
          confidence: 1,
        });
      }
    }
  }

  // 6. Very long sentences (R-14) — no automatic fix, the creator edits it
  if (has("R-14")) {
    const sentences = content.match(/[^.!?\n]+[.!?]?/g) ?? [];
    for (const s of sentences) {
      const words = s.trim().split(/\s+/).filter(Boolean);
      if (words.length > 30) {
        findings.push({
          source: "rule",
          category: "readability",
          severity: "suggestion",
          span_text: s.trim(),
          rule_id: "R-14",
          fact_id: null,
          explanation: `This sentence has ${words.length} words. Keep sentences under 30 words so they're easy to read.`,
          suggested_fix: null,
          confidence: 1,
        });
      }
    }
  }

  return findings;
}
