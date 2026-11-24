// GET /api/drafts?status=pending_approval — list of drafts (newest first),
// with the number of open/disputed findings for each.
// Owner: Member 2
import { NextResponse } from "next/server";
import { getDb } from "../../../lib/db";
import { getWorkspaceId } from "../../../lib/workspace";

export async function GET(req: Request) {
  try {
    const db = getDb();
    const status = new URL(req.url).searchParams.get("status");

    const ws = await getWorkspaceId();
    let query = db.from("drafts").select("*").eq("workspace_id", ws).order("created_at", { ascending: false }).limit(100);
    if (status) query = query.eq("status", status);
    const { data: drafts, error } = await query;
    if (error) throw error;

    const ids = (drafts ?? []).map((d) => d.id);
    const counts: Record<string, { total: number; disputed: number }> = {};
    if (ids.length > 0) {
      const { data: fs, error: fErr } = await db.from("findings").select("draft_id,status").in("draft_id", ids);
      if (fErr) throw fErr;
      for (const f of fs ?? []) {
        counts[f.draft_id] ??= { total: 0, disputed: 0 };
        counts[f.draft_id].total++;
        if (f.status === "disputed") counts[f.draft_id].disputed++;
      }
    }

    return NextResponse.json(
      (drafts ?? []).map((d) => ({ ...d, issues: counts[d.id]?.total ?? 0, disputes: counts[d.id]?.disputed ?? 0 }))
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not load drafts." }, { status: 500 });
  }
}
