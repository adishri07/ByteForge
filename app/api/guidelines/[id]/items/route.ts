// PATCH /api/guidelines/:id/items — the manager edits or rejects one extracted item before approval.
// body: { kind: "rule"|"term"|"fact"|"color", key, changes?: {...}, reject?: boolean, restore?: boolean }
// Owner: Member 2
import { NextResponse } from "next/server";
import { getDb } from "../../../../../lib/db";
import { normaliseHex } from "../../../../../lib/extractRules";
import { getRole } from "../../../../../lib/role";

const TABLES = {
  rule: { table: "rules", key: "uid", fields: ["text", "severity", "category"] },
  term: { table: "terms", key: "id", fields: ["term", "type", "replacement"] },
  fact: { table: "facts", key: "uid", fields: ["claim", "source", "expires_on"] },
  color: { table: "brand_assets", key: "id", fields: ["label", "value"] },
} as const;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if ((await getRole()) !== "manager") return NextResponse.json({ error: "Only a Brand Manager can edit the rulebook." }, { status: 403 });
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const cfg = TABLES[body?.kind as keyof typeof TABLES];
    if (!cfg || body?.key === undefined) return NextResponse.json({ error: "Unknown item." }, { status: 400 });

    const db = getDb();
    const { data: upload } = await db.from("guideline_uploads").select("status").eq("id", id).single();
    if (upload?.status !== "review") return NextResponse.json({ error: "This rulebook can no longer be edited here." }, { status: 409 });

    const update: Record<string, unknown> = {};
    if (body.reject) update.status = "rejected";
    if (body.restore) update.status = "pending";
    for (const f of cfg.fields) {
      if (body.changes && f in body.changes) {
        let v = body.changes[f];
        if (typeof v === "string") v = v.trim().slice(0, 300);
        if (f === "severity" && !["blocker", "warning", "suggestion"].includes(String(v))) continue;
        if (f === "expires_on" && !/^\d{4}-\d{2}-\d{2}$/.test(String(v))) {
          return NextResponse.json({ error: "Please use the date format YYYY-MM-DD." }, { status: 400 });
        }
        if (f === "value") {
          v = normaliseHex(v);
          if (!v) return NextResponse.json({ error: "Please enter a colour as a hex code, e.g. #1F6FEB." }, { status: 400 });
        }
        if ((f === "text" || f === "term" || f === "claim") && !String(v).trim()) {
          return NextResponse.json({ error: "This can't be empty. Reject it instead if you don't want it." }, { status: 400 });
        }
        update[f] = v === "" ? null : v;
      }
    }
    if (Object.keys(update).length === 0) return NextResponse.json({ error: "Nothing to change." }, { status: 400 });

    const { data, error } = await db.from(cfg.table).update(update).eq(cfg.key, body.key).eq("upload_id", id).select().single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not save the change." }, { status: 500 });
  }
}
