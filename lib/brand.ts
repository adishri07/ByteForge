// Loads one brand's approved rulebook (rules, terms, facts, colours, logo).
// Only ACTIVE (approved) items are used for checking.
// Owner: Member 1
import { getDb } from "./db";
import type { Brand } from "./types";

export async function getBrand(workspaceId: string): Promise<Brand> {
  const db = getDb();
  const [ws, rules, terms, facts, assets] = await Promise.all([
    db.from("workspaces").select("name").eq("id", workspaceId).maybeSingle(),
    db.from("rules").select("id,category,text,severity").eq("workspace_id", workspaceId).eq("status", "active").order("id"),
    db.from("terms").select("id,term,type,replacement,rule_id").eq("workspace_id", workspaceId).eq("status", "active").order("id"),
    db.from("facts").select("id,claim,source,expires_on").eq("workspace_id", workspaceId).eq("status", "active").order("id"),
    db.from("brand_assets").select("type,label,value").eq("workspace_id", workspaceId).eq("status", "active"),
  ]);
  for (const r of [rules, terms, facts, assets]) if (r.error) throw r.error;


  return {
    workspaceId,
    name: ws.data?.name?.replace(/\s*\(demo\)$/i, "") ?? "the brand",
    rules: rules.data ?? [],
    terms: terms.data ?? [],
    facts: facts.data ?? [],
    colors: (assets.data ?? []).filter((a) => a.type === "color").map((a) => ({ label: a.label, value: a.value })),
    logoPath: (assets.data ?? []).find((a) => a.type === "logo")?.value ?? null,
  };
}
