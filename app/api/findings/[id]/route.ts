// POST /api/findings/:id — the creator's choice for one issue.
// body: { action: "accept" } | { action: "edit", userText } | { action: "dispute", reason } | { action: "reopen" }
// Owner: Member 2
import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { action, userText, reason } = await req.json();
    const db = getDb();

    const { data: finding, error } = await db.from("findings").select("*").eq("id", id).single();
    if (error || !finding) return NextResponse.json({ error: "Issue not found." }, { status: 404 });

    const { data: draft } = await db.from("drafts").select("status").eq("id", finding.draft_id).single();
    if (draft?.status !== "in_review_by_creator") {
      return NextResponse.json({ error: "This draft has already been sent for approval." }, { status: 409 });
    }

    let update: Record<string, unknown>;
    let log: string;
    const cite = finding.rule_id ?? finding.fact_id;

    if (action === "accept") {
      if (finding.suggested_fix === null) {
        return NextResponse.json({ error: "This issue has no automatic fix. Please use Edit." }, { status: 400 });
      }
      update = { status: "accepted", user_text: null, dispute_reason: null };
      log = `Accepted fix for "${finding.span_text}" (${cite})`;
    } else if (action === "edit") {
      if (typeof userText !== "string") return NextResponse.json({ error: "Please type your fix." }, { status: 400 });
      update = { status: "edited", user_text: userText, dispute_reason: null };
      log = `Edited "${finding.span_text}" → "${userText}" (${cite})`;
    } else if (action === "dispute") {
      if (!reason || !String(reason).trim()) {
        return NextResponse.json({ error: "Please give a reason for disputing." }, { status: 400 });
      }
      update = { status: "disputed", dispute_reason: String(reason).trim(), user_text: null };
      log = `Disputed "${finding.span_text}" (${cite}): ${String(reason).trim()}`;
    } else if (action === "reopen") {
      update = { status: "open", user_text: null, dispute_reason: null };
      log = `Re-opened "${finding.span_text}" (${cite})`;
    } else {
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }

    const { data: updated, error: uErr } = await db.from("findings").update(update).eq("id", id).select().single();
    if (uErr) throw uErr;
    await db.from("audit_log").insert({ draft_id: finding.draft_id, actor_role: "creator", action: log });

    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not save your choice." }, { status: 500 });
  }
}
