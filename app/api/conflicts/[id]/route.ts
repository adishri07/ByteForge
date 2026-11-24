// POST /api/conflicts/:id — the manager resolves a contradiction between two rules.
// body: { resolution: "keep_a" | "keep_b" | "edit" | "keep_both", ruleId?, text? }
// Owner: Member 2
import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";
import { getRole } from "../../../../lib/role";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if ((await getRole()) !== "manager") return NextResponse.json({ error: "Only a Brand Manager can resolve conflicts." }, { status: 403 });
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const db = getDb();

    const { data: c } = await db.from("rule_conflicts").select("*").eq("id", id).single();
    if (!c) return NextResponse.json({ error: "Conflict not found." }, { status: 404 });
    if (c.status === "resolved") return NextResponse.json(c); // already done (e.g. a double click)

    const ruleRow = (code: string) => db.from("rules").update({ status: "rejected" }).eq("upload_id", c.upload_id).eq("id", code);
    let resolution: string;

    if (body?.resolution === "keep_a") {
      await ruleRow(c.rule_b);
      resolution = `Kept ${c.rule_a}, removed ${c.rule_b}`;
    } else if (body?.resolution === "keep_b") {
      await ruleRow(c.rule_a);
      resolution = `Kept ${c.rule_b}, removed ${c.rule_a}`;
    } else if (body?.resolution === "edit") {
      const ruleId = String(body.ruleId ?? "");
      const text = String(body.text ?? "").trim().slice(0, 300);
      if (![c.rule_a, c.rule_b].includes(ruleId) || text.length < 5) {
        return NextResponse.json({ error: "Please choose a rule and write its new wording." }, { status: 400 });
      }
      const { error } = await db.from("rules").update({ text, status: "pending" }).eq("upload_id", c.upload_id).eq("id", ruleId);
      if (error) throw error;
      resolution = `Rewrote ${ruleId}: "${text}"`;
    } else if (body?.resolution === "keep_both") {
      resolution = `Kept both ${c.rule_a} and ${c.rule_b} (manager decided they don't really clash)`;
    } else {
      return NextResponse.json({ error: "Please choose how to resolve this conflict." }, { status: 400 });
    }

    const { data, error } = await db.from("rule_conflicts").update({ status: "resolved", resolution }).eq("id", id).select().single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not save this decision." }, { status: 500 });
  }
}
