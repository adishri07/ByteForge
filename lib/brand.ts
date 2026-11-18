// Loads the brand rulebook (rules, terms, facts) from the database.
// Owner: Member 1
import { getDb } from "./db";
import type { Brand } from "./types";

export async function getBrand(): Promise<Brand> {
  const db = getDb();
  const [rules, terms, facts] = await Promise.all([
    db.from("rules").select("*").order("id"),
    db.from("terms").select("*").order("id"),
    db.from("facts").select("*").order("id"),
  ]);
  if (rules.error) throw rules.error;
  if (terms.error) throw terms.error;
  if (facts.error) throw facts.error;
  return { rules: rules.data ?? [], terms: terms.data ?? [], facts: facts.data ?? [] };
}
