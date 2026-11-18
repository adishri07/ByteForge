// GET /api/drafts/:id — one draft with all versions, findings and history.
// Owner: Member 2
import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();

    const [draft, versions, findings, audit] = await Promise.all([
      db.from("drafts").select("*").eq("id", id).single(),
      db.from("draft_versions").select("*").eq("draft_id", id).order("version_no"),
      db.from("findings").select("*").eq("draft_id", id).order("id"),
      db.from("audit_log").select("*").eq("draft_id", id).order("created_at"),
    ]);
    if (draft.error) return NextResponse.json({ error: "Draft not found." }, { status: 404 });

    return NextResponse.json({
      draft: draft.data,
      versions: versions.data ?? [],
      findings: findings.data ?? [],
      audit: audit.data ?? [],
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not load this draft." }, { status: 500 });
  }
}
