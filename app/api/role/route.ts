// GET /api/role?as=creator|manager[&next=/path] — "Try as Creator / Manager" with no sign-up.
// Owner: Member 3
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const as = url.searchParams.get("as") === "manager" ? "manager" : "creator";
  const nextParam = url.searchParams.get("next");
  const next = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : as === "manager" ? "/approvals" : "/submit";

  const res = NextResponse.redirect(new URL(next, req.url));
  res.cookies.set("role", as, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 7 });
  return res;
}
