// POST /api/drafts/:id/decision — manager approves or requests changes.
// body: { decision: "approve" | "request_changes", comment }
// Owner: Member 2
import { NextResponse } from "next/server";
import { getDb } from "../../../../../lib/db";
import { getRole } from "../../../../../lib/role";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { decision, comment } = await req.json();

    if ((await getRole()) !== "manager") {
      return NextResponse.json({ error: "Only a Brand Manager can approve. Switch to Manager at the top." }, { status: 403 });
    }
    if (decision !== "approve" && decision !== "request_changes") {
      return NextResponse.json({ error: "Unknown decision." }, { status: 400 });
    }
    if (decision === "request_changes" && !String(comment ?? "").trim()) {
      return NextResponse.json({ error: "Please add a comment explaining what to change." }, { status: 400 });
    }

    const db = getDb();
    const { data: draft } = await db.from("drafts").select("status").eq("id", id).single();
    if (!draft) return NextResponse.json({ error: "Draft not found." }, { status: 404 });
    if (draft.status !== "pending_approval") {
      return NextResponse.json({ error: "This draft is not waiting for approval." }, { status: 409 });
    }

    const status = decision === "approve" ? "approved" : "changes_requested";
    const note = String(comment ?? "").trim() || null;
    await db.from("drafts").update({ status, manager_comment: note }).eq("id", id);
    await db.from("audit_log").insert({
      draft_id: id,
      actor_role: "manager",
      action: decision === "approve" ? "Approved for publishing" : "Changes requested",
      comment: note,
    });

    return NextResponse.json({ ok: true, status });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not save the decision." }, { status: 500 });
  }
}
