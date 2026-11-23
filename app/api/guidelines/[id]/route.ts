// GET /api/guidelines/:id — everything the manager reviews before approving:
// the upload, extracted rules / words / facts / colours, and conflicts.
// Owner: Member 2
import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const { data: upload, error } = await db.from("guideline_uploads").select("*, workspaces(name)").eq("id", id).single();
    if (error || !upload) return NextResponse.json({ error: "Upload not found." }, { status: 404 });

    const [rules, terms, facts, colors, conflicts] = await Promise.all([
      db.from("rules").select("uid,id,category,text,severity,status").eq("upload_id", id).order("id"),
      db.from("terms").select("id,term,type,replacement,rule_id,status").eq("upload_id", id).order("id"),
      db.from("facts").select("uid,id,claim,source,expires_on,status").eq("upload_id", id).order("id"),
      db.from("brand_assets").select("id,label,value,status").eq("upload_id", id).eq("type", "color"),
      db.from("rule_conflicts").select("*").eq("upload_id", id).order("created_at"),
    ]);

    return NextResponse.json({
      upload,
      rules: rules.data ?? [],
      terms: terms.data ?? [],
      facts: facts.data ?? [],
      colors: colors.data ?? [],
      conflicts: conflicts.data ?? [],
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not load this upload." }, { status: 500 });
  }
}
