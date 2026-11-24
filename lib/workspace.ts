// Which brand (workspace) the visitor is working in. Stored in the "ws" cookie.
// Owner: Member 3
import { cookies } from "next/headers";
import { getDb } from "./db";

export const DEMO_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getWorkspaceId(): Promise<string> {
  const store = await cookies();
  const ws = store.get("ws")?.value;
  if (!ws || !UUID.test(ws)) return DEMO_WORKSPACE_ID;
  // fall back to the demo if the workspace was deleted
  const { data } = await getDb().from("workspaces").select("id").eq("id", ws).maybeSingle();
  return data?.id ?? DEMO_WORKSPACE_ID;
}

export const WS_COOKIE = { path: "/", sameSite: "lax" as const, maxAge: 60 * 60 * 24 * 30 };
