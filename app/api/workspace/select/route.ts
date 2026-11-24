// GET /api/workspace/select?id=<workspace>&next=/path — switch brand
// Owner: Member 3
import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";
import { DEMO_WORKSPACE_ID, WS_COOKIE } from "../../../../lib/workspace";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? DEMO_WORKSPACE_ID;
  const nextParam = url.searchParams.get("next");
  const next = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/brand";

  const { data } = await getDb().from("workspaces").select("id").eq("id", id).maybeSingle();
  const res = NextResponse.redirect(new URL(next, req.url));
  res.cookies.set("ws", data?.id ?? DEMO_WORKSPACE_ID, WS_COOKIE);
  return res;
}
