// Saves a checked draft (text or image) with its first version, findings and history.
// Used by /api/review and /api/review-image.
// Owner: Member 2
import { getDb } from "./db";
import type { Finding, RiskLevel } from "./types";

export async function saveCheckedDraft(input: {
  workspaceId: string;
  title: string;
  channel: string;
  content: string;
  findings: Finding[];
  riskLevel: RiskLevel;
  riskReasons: string[];
  aiNote: string | null;
  kind?: "text" | "image";
  imagePath?: string | null;
  altText?: string | null;
}) {
  const db = getDb();
  const { data: draft, error: draftErr } = await db
    .from("drafts")
    .insert({
      workspace_id: input.workspaceId,
      title: input.title.trim().slice(0, 120) || "Untitled draft",
      channel: input.channel || "General",
      status: "in_review_by_creator",
      risk_level: input.riskLevel,
      risk_reasons: input.riskReasons,
      ai_note: input.aiNote,
      kind: input.kind ?? "text",
      image_path: input.imagePath ?? null,
      alt_text: input.altText ?? null,
    })
    .select()
    .single();
  if (draftErr) throw draftErr;

  const { error: vErr } = await db.from("draft_versions").insert({ draft_id: draft.id, version_no: 1, content: input.content });
  if (vErr) throw vErr;

  if (input.findings.length > 0) {
    const { error: fErr } = await db
      .from("findings")
      .insert(input.findings.map((f) => ({ ...f, draft_id: draft.id, status: "open" })));
    if (fErr) throw fErr;
  }

  await db.from("audit_log").insert([
    { draft_id: draft.id, actor_role: "creator", action: input.kind === "image" ? "Image submitted for checking" : "Draft submitted for checking" },
    { draft_id: draft.id, actor_role: "system", action: `BrandProof found ${input.findings.length} issue(s) — risk ${input.riskLevel}` },
  ]);

  return draft as { id: string };
}
