// Works out how risky a draft is to publish.
// Owner: Member 2
import type { Finding, RiskLevel } from "./types";

const SCARY = /guarantee|100\s?%|cure|never fail|risk[- ]free|#\s?1|number one/i;

export function scoreRisk(findings: Finding[]): { level: RiskLevel; reasons: string[] } {
  const blockers = findings.filter((f) => f.severity === "blocker");
  const warnings = findings.filter((f) => f.severity === "warning");

  let level: RiskLevel = "Low";
  if (blockers.some((f) => f.category === "claim" && SCARY.test(f.span_text))) level = "Critical";
  else if (blockers.length > 0) level = "High";
  else if (warnings.length >= 2) level = "Medium";
  else if (warnings.length === 1) level = "Low";

  const reasons = [...blockers, ...warnings]
    .slice(0, 3)
    .map((f) => `"${f.span_text}": ${f.explanation} (${f.rule_id ?? f.fact_id})`);

  if (findings.length === 0) reasons.push("No issues found against this brand's rules.");

  return { level, reasons };
}
