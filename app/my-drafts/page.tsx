"use client";
// Creator's list of drafts and their status.
// Owner: Member 5
import Link from "next/link";
import { useEffect, useState } from "react";
import RiskBadge from "../../components/RiskBadge";

type Row = { id: string; title: string; channel: string; risk_level: string; status: string; created_at: string; manager_comment: string | null };

const STATUS: Record<string, string> = {
  in_review_by_creator: "✏️ Fixing issues",
  pending_approval: "⏳ Waiting for approval",
  changes_requested: "↩️ Changes requested",
  approved: "✅ Approved",
};

export default function MyDrafts() {
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    fetch("/api/drafts").then((r) => r.json()).then(setRows);
  }, []);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My drafts</h1>
        <Link href="/submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
          + Check new content
        </Link>
      </div>
      {rows === null ? (
        <p className="mt-6 text-slate-600">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-6 text-slate-600">No drafts yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((d) => (
            <li key={d.id}>
              <Link href={`/drafts/${d.id}`} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-300">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{d.title}</p>
                  <p className="text-sm text-slate-500">
                    {d.channel} · {STATUS[d.status]} · {new Date(d.created_at).toLocaleString()}
                  </p>
                  {d.status === "changes_requested" && d.manager_comment && <p className="mt-1 text-sm text-amber-900">Manager: “{d.manager_comment}”</p>}
                </div>
                <RiskBadge level={d.risk_level} size="sm" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
