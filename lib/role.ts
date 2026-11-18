// Demo roles without sign-up: the "role" cookie is "creator" or "manager".
// Owner: Member 3
import { cookies } from "next/headers";

export type Role = "creator" | "manager";

export async function getRole(): Promise<Role> {
  const store = await cookies();
  return store.get("role")?.value === "manager" ? "manager" : "creator";
}
