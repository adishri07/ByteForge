// GET /api/workspaces — list brands (+ which one is current)
// POST /api/workspaces { name } — create a brand and switch to it
// Owner: Member 3
import { NextResponse } from "next/server";
import { getDb } from "../../../lib/db";
import { getWorkspaceId, WS_COOKIE } from "../../../lib/workspace";

export async function GET() {
  try {
    const current = await getWorkspaceId();
    const { data, error } = await getDb().from("workspaces").select("id,name,created_at").order("created_at");
    if (error) throw error;
    return NextResponse.json({ current, workspaces: data ?? [] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not load brands." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name } = await req.json().catch(() => ({}));
    const clean = String(name ?? "").trim().slice(0, 60);
    if (clean.length < 2) return NextResponse.json({ error: "Please enter a brand name." }, { status: 400 });

    const { data, error } = await getDb().from("workspaces").insert({ name: clean }).select().single();
    if (error) throw error;

    const res = NextResponse.json(data);
    res.cookies.set("ws", data.id, WS_COOKIE);
    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not create the brand." }, { status: 500 });
  }
}
