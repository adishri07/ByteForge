// POST /api/drafts/:id/submit — creator sends the fixed draft for approval.
// Builds the corrected text, saves it as a new version, status -> pending_approval.
// Owner: Member 2
import { NextResponse } from "next/server";
import { getDb } from "../../../../../lib/db";
import { applyFixes } from "../../../../../lib/applyFixes";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();

    const { data: draft } = await db.from("drafts").select("*").eq("id", id).single();
    if (!draft) return NextResponse.json({ error: "Draft not found." }, { status: 404 });
    if (draft.status !== "in_review_by_creator") {
      return NextResponse.json({ error: "This draft has already been sent." }, { status: 409 });
    }

    const { data: findings } = await db.from("findings").select("*").eq("draft_id", id);
    const openBlockers = (findings ?? []).filter((f) => f.severity === "blocker" && f.status === "open");
    if (openBlockers.length > 0) {
      return NextResponse.json(
        { error: `Please fix, edit or dispute the ${openBlockers.length} blocker issue(s) first.` },
        { status: 400 }
      );
    }

    const { data: versions } = await db
      .from("draft_versions")
      .select("*")
      .eq("draft_id", id)
      .order("version_no", { ascending: false })
      .limit(1);
    const latest = versions?.[0];
    if (!latest) return NextResponse.json({ error: "Draft text not found." }, { status: 404 });

    const { text, applied } = applyFixes(latest.content, findings ?? []);
    const disputed = (findings ?? []).filter((f) => f.status === "disputed").length;

    await db.from("draft_versions").insert({ draft_id: id, version_no: latest.version_no + 1, content: text });
    await db.from("drafts").update({ status: "pending_approval" }).eq("id", id);
    await db.from("audit_log").insert({
      draft_id: id,
      actor_role: "creator",
      action: `Sent for approval — ${applied} fix(es) applied, ${disputed} disputed`,
    });

    return NextResponse.json({ ok: true, finalText: text });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not send for approval." }, { status: 500 });
  }
}
