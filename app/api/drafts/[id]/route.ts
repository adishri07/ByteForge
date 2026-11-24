// GET /api/drafts/:id — one draft with all versions, findings and history.
// Owner: Member 2
import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";
import { getBrand } from "../../../../lib/brand";
import { signedUrl } from "../../../../lib/storage";
import { getWorkspaceId } from "../../../../lib/workspace";

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
    if (draft.data.workspace_id !== (await getWorkspaceId())) {
      return NextResponse.json({ error: "This draft belongs to another brand. Switch brand (top bar) to view it." }, { status: 404 });
    }

    // the rulebook this draft was checked against (for showing rule text on cards)
    const brand = await getBrand(draft.data.workspace_id);

    return NextResponse.json({
      draft: { ...draft.data, image_url: await signedUrl(draft.data.image_path) },
      brand: { name: brand.name, rules: brand.rules, facts: brand.facts, colors: brand.colors },
      versions: versions.data ?? [],
      findings: findings.data ?? [],
      audit: audit.data ?? [],
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not load this draft." }, { status: 500 });
  }
}
