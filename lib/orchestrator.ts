// Runs every check on a draft and merges the results.
// Owner: Member 1
import { aiReview } from "./ai";
import { validate } from "./validator";
import { ruleChecks } from "./ruleEngine";
import { claimChecks } from "./claims";
import { scoreRisk } from "./risk";
import type { Brand, Finding } from "./types";

function overlaps(a: string, b: string) {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return x.includes(y) || y.includes(x);
}

export async function runReview(content: string, channel: string, brand: Brand) {
  // 1. Rule checks (no AI) — instant and always reliable
  const rank = { blocker: 0, warning: 1, suggestion: 2 } as const;
  const ruleFindings: Finding[] = [];
  for (const f of [...claimChecks(content, brand), ...ruleChecks(content, brand)]) {
    // same words flagged twice (e.g. "GUARANTEED" = claim + ALL CAPS): keep the more serious one
    const same = ruleFindings.findIndex((m) => m.span_text === f.span_text);
    if (same === -1) ruleFindings.push(f);
    else if (rank[f.severity] < rank[ruleFindings[same].severity]) ruleFindings[same] = f;
  }

  // 2. AI check — grounded in the rulebook, then validated
  let aiFindings: Finding[] = [];
  let aiNote: string | null = null;
  try {
    aiFindings = validate(await aiReview(content, channel, brand), content, brand);
  } catch (err) {
    console.error("AI review failed:", err);
    aiNote = "The AI check is unavailable right now, so only rule checks are shown.";
  }

  // 3. Merge. If a rule check already flagged the same words, keep the rule check —
  //    but if the rule check had no automatic fix, borrow the AI's fix (and its wider phrase).
  const merged: Finding[] = [...ruleFindings];
  for (const f of aiFindings) {
    const i = merged.findIndex((m) => overlaps(m.span_text, f.span_text));
    if (i === -1) {
      merged.push(f);
    } else if (merged[i].suggested_fix === null && f.suggested_fix) {
      const wider = f.span_text.length >= merged[i].span_text.length;
      merged[i] = {
        ...merged[i],
        span_text: wider ? f.span_text : merged[i].span_text,
        suggested_fix: wider ? f.suggested_fix : null,
      };
    }
  }

  // 4. Risk level
  const risk = scoreRisk(merged);

  return { findings: merged, riskLevel: risk.level, riskReasons: risk.reasons, aiNote };
}
