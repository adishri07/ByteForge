// Shared types used by every part of BrandProof.
// Owner: Member 1. Don't change these without telling the team.

export type Category =
  | "tone"
  | "terminology"
  | "claim"
  | "fact"
  | "readability"
  | "accessibility"
  | "messaging";

export type Severity = "blocker" | "warning" | "suggestion";

export type Finding = {
  source: "rule" | "ai";
  category: Category;
  severity: Severity;
  span_text: string; // the exact words from the draft
  rule_id: string | null; // e.g. "R-04"
  fact_id: string | null; // e.g. "F-05"
  explanation: string; // why it is a problem, in plain English
  suggested_fix: string | null; // replacement for span_text (null = no automatic fix)
  confidence: number; // 0 to 1 (rule checks are always 1)
};

// A finding after it has been saved in the database
export type SavedFinding = Finding & {
  id: number;
  draft_id: string;
  status: "open" | "accepted" | "edited" | "disputed";
  user_text: string | null;
  dispute_reason: string | null;
};

export type RiskLevel = "Low" | "Medium" | "High" | "Critical";

export type Rule = {
  id: string;
  category: string;
  text: string;
  severity: Severity;
};

export type Term = {
  id: number;
  term: string;
  type: "banned" | "competitor" | "misspelling" | "preferred";
  replacement: string | null;
  rule_id: string | null;
};

export type Fact = {
  id: string;
  claim: string;
  source: string;
  expires_on: string; // YYYY-MM-DD
};

export type Brand = { rules: Rule[]; terms: Term[]; facts: Fact[] };

export type DraftStatus =
  | "in_review_by_creator"
  | "pending_approval"
  | "changes_requested"
  | "approved";
