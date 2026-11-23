// POST /api/guidelines/:id/approve — the manager approves the reviewed rulebook.
// Blocked while conflicts are open. Pending items become active, default visual rules are added,
// and the manager is switched to the new brand.
// Owner: Member 2
import { NextResponse } from "next/server";
import { getDb } from "../../../../../lib/db";
import { getRole } from "../../../../../lib/role";
import { WS_COOKIE } from "../../../../../lib/workspace";

const DEFAULT_VISUAL_RULES = [
  { id: "V-01", category: "visual", text: "Use only approved brand colours in images.", severity: "warning" },
  { id: "V-02", category: "visual", text: "Images must show the approved logo, unaltered.", severity: "blocker" },
  { id: "V-03", category: "accessibility", text: "Text on images must have a contrast ratio of at least 4.5:1 (WCAG AA).", severity: "warning" },
  { id: "V-04", category: "accessibility", text: "Every image needs alt text describing it.", severity: "warning" },
];

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if ((await getRole()) !== "manager") return NextResponse.json({ error: "Only a Brand Manager can approve a rulebook." }, { status: 403 });
    const { id } = await params;
    const db = getDb();

    const { data: upload } = await db.from("guideline_uploads").select("*").eq("id", id).single();
    if (!upload) return NextResponse.json({ error: "Upload not found." }, { status: 404 });
    if (upload.status === "approved") return NextResponse.json({ ok: true, workspaceId: upload.workspace_id, already: true });
    if (upload.status !== "review") return NextResponse.json({ error: "This upload isn't ready to approve." }, { status: 409 });

    const { count: open } = await db.from("rule_conflicts").select("id", { count: "exact", head: true }).eq("upload_id", id).eq("status", "open");
    if ((open ?? 0) > 0) {
      return NextResponse.json({ error: `Please resolve the ${open} open conflict(s) first.` }, { status: 400 });
    }

    const { count: rulesLeft } = await db.from("rules").select("uid", { count: "exact", head: true }).eq("upload_id", id).eq("status", "pending");
    if ((rulesLeft ?? 0) === 0) return NextResponse.json({ error: "There are no rules left to approve." }, { status: 400 });

    // pending -> active (rejected items stay rejected)
    for (const table of ["rules", "terms", "facts", "brand_assets"]) {
      const { error } = await db.from(table).update({ status: "active" }).eq("upload_id", id).eq("status", "pending");
      if (error) throw error;
    }

    // add default visual rules unless the guideline already has them
    const { data: existing } = await db.from("rules").select("text").eq("workspace_id", upload.workspace_id).eq("status", "active");
    const texts = (existing ?? []).map((r) => r.text.toLowerCase()).join(" | ");
    const toAdd = DEFAULT_VISUAL_RULES.filter((r) => {
      if (r.id === "V-01") return !/brand colou?r|colou?r palette|approved colou?r/.test(texts);
      if (r.id === "V-02") return !/logo/.test(texts);
      if (r.id === "V-03") return !/contrast/.test(texts);
      return !/alt[\s-]?text|alternative text/.test(texts);
    });
    if (toAdd.length) {
      await db.from("rules").insert(toAdd.map((r) => ({ ...r, workspace_id: upload.workspace_id, upload_id: id, status: "active" })));
    }

    await db.from("guideline_uploads").update({ status: "approved" }).eq("id", id);

    const res = NextResponse.json({ ok: true, workspaceId: upload.workspace_id });
    res.cookies.set("ws", upload.workspace_id, WS_COOKIE);
    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not approve the rulebook. Please try again." }, { status: 500 });
  }
}
