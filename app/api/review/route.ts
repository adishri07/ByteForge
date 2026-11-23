// POST /api/review — the "Check content" button (text).
// Runs every check for the current brand, saves the draft and findings, returns the result.
// Owner: Member 1
import { NextResponse } from "next/server";
import { getBrand } from "../../../lib/brand";
import { runReview } from "../../../lib/orchestrator";
import { saveCheckedDraft } from "../../../lib/saveDraft";
import { getWorkspaceId } from "../../../lib/workspace";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Something was wrong with the request. Please try again." }, { status: 400 });
    const { title, channel, content } = body;

    if (!content || typeof content !== "string" || content.trim().length < 3) {
      return NextResponse.json({ error: "Please paste some content to check (at least a few words)." }, { status: 400 });
    }
    if (content.length > 5000) {
      return NextResponse.json({ error: "Please keep content under 5,000 characters." }, { status: 400 });
    }

    const workspaceId = await getWorkspaceId();
    const brand = await getBrand(workspaceId);
    if (brand.rules.length === 0) {
      return NextResponse.json(
        { error: "This brand has no approved rules yet. A Brand Manager needs to upload and approve a guideline first (Guidelines page)." },
        { status: 400 }
      );
    }

    const result = await runReview(content, channel || "General", brand);
    const draft = await saveCheckedDraft({
      workspaceId,
      title: String(title ?? ""),
      channel: String(channel ?? "General"),
      content,
      ...result,
    });

    return NextResponse.json({ draftId: draft.id, ...result });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Something went wrong while checking. Please try again." }, { status: 500 });
  }
}
