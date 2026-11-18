// POST /api/review — the "Check content" button.
// Saves the draft, runs every check, saves the findings, returns the result.
// Owner: Member 1
import { NextResponse } from "next/server";
import { getDb } from "../../../lib/db";
import { getBrand } from "../../../lib/brand";
import { runReview } from "../../../lib/orchestrator";

export async function POST(req: Request) {
  try {
    const { title, channel, content } = await req.json();
    if (!content || typeof content !== "string" || content.trim().length < 3) {
      return NextResponse.json({ error: "Please paste some content to check." }, { status: 400 });
    }
    if (content.length > 5000) {
      return NextResponse.json({ error: "Please keep content under 5,000 characters." }, { status: 400 });
    }

    const db = getDb();
    const brand = await getBrand();
    const result = await runReview(content, channel || "General", brand);

    // save the draft
    const { data: draft, error: draftErr } = await db
      .from("drafts")
      .insert({
        title: title?.trim() || "Untitled draft",
        channel: channel || "General",
        status: "in_review_by_creator",
        risk_level: result.riskLevel,
        risk_reasons: result.riskReasons,
        ai_note: result.aiNote,
      })
      .select()
      .single();
    if (draftErr) throw draftErr;

    // version 1 = what the creator pasted
    const { error: vErr } = await db
      .from("draft_versions")
      .insert({ draft_id: draft.id, version_no: 1, content });
    if (vErr) throw vErr;

    // the findings
    if (result.findings.length > 0) {
      const { error: fErr } = await db
        .from("findings")
        .insert(result.findings.map((f) => ({ ...f, draft_id: draft.id, status: "open" })));
      if (fErr) throw fErr;
    }

    // history
    await db.from("audit_log").insert([
      { draft_id: draft.id, actor_role: "creator", action: "Draft submitted for checking" },
      {
        draft_id: draft.id,
        actor_role: "system",
        action: `BrandProof found ${result.findings.length} issue(s) — risk ${result.riskLevel}`,
      },
    ]);

    return NextResponse.json({ draftId: draft.id, ...result });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Something went wrong while checking. Please try again." }, { status: 500 });
  }
}
