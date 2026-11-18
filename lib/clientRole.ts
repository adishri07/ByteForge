// Reads the demo role in the browser (for showing/hiding buttons).
// Owner: Member 3
import { useSyncExternalStore } from "react";

export type ClientRole = "creator" | "manager";

export function getClientRole(): ClientRole {
  if (typeof document === "undefined") return "creator";
  return document.cookie.split("; ").includes("role=manager") ? "manager" : "creator";
}

// React hook: the role cookie only changes on a full page load (via /api/role),
// so there is nothing to subscribe to.
const noop = () => () => {};
export function useClientRole(): ClientRole {
  return useSyncExternalStore(noop, getClientRole, () => "creator");
}
