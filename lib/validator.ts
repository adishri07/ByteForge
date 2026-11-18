// "Cite or don't flag": removes any AI finding that does not point to a real
// rule/fact, or whose text is not actually in the draft.
// Owner: Member 1
import type { Brand, Category, Finding, Severity } from "./types";

const CATEGORIES: Category[] = ["tone", "terminology", "claim", "fact", "readability", "accessibility", "messaging"];
const SEVERITIES: Severity[] = ["blocker", "warning", "suggestion"];

export function validate(findings: Finding[], content: string, brand: Brand): Finding[] {
  const ruleIds = new Set(brand.rules.map((r) => r.id));
  const factIds = new Set(brand.facts.map((f) => f.id));
  const ruleSeverity = new Map(brand.rules.map((r) => [r.id, r.severity]));

  return findings
    .filter((f) => {
      const citesRealRule = !!f.rule_id && ruleIds.has(f.rule_id);
      const citesRealFact = !!f.fact_id && factIds.has(f.fact_id);
      const textIsReallyThere = f.span_text.trim().length > 0 && content.includes(f.span_text);
      return (citesRealRule || citesRealFact) && textIsReallyThere;
    })
    .map((f) => ({
      ...f,
      // drop a citation that doesn't exist, keep the one that does
      rule_id: f.rule_id && ruleIds.has(f.rule_id) ? f.rule_id : null,
      fact_id: f.fact_id && factIds.has(f.fact_id) ? f.fact_id : null,
      category: CATEGORIES.includes(f.category) ? f.category : "tone",
      // trust the rulebook's severity over the AI's
      severity:
        (f.rule_id && ruleSeverity.get(f.rule_id)) ||
        (SEVERITIES.includes(f.severity) ? f.severity : "warning"),
      // a "fix" identical to the original isn't a fix
      suggested_fix: f.suggested_fix && f.suggested_fix !== f.span_text ? f.suggested_fix : null,
    }));
}
