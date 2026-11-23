"use client";
// Manager's queue: drafts waiting for approval, highest risk first.
// Owner: Member 5
import Link from "next/link";
import { useEffect, useState } from "react";
import RiskBadge from "../../components/RiskBadge";

type Row = { id: string; title: string; kind?: string; channel: string; risk_level: string; created_at: string; issues: number; disputes: number; status: string };
const ORDER: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

export default function ApprovalsPage() {
  const [waiting, setWaiting] = useState<Row[] | null>(null);
  const [done, setDone] = useState<Row[]>([]);

  useEffect(() => {
    fetch("/api/drafts?status=pending_approval")
      .then((r) => r.json())
      .then((rows: Row[]) => setWaiting([...rows].sort((a, b) => (ORDER[a.risk_level] ?? 9) - (ORDER[b.risk_level] ?? 9))));
    Promise.all([fetch("/api/drafts?status=approved").then((r) => r.json()), fetch("/api/drafts?status=changes_requested").then((r) => r.json())]).then(
      ([a, c]) => setDone([...a, ...c].slice(0, 10))
    );
  }, []);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold">Waiting for approval</h1>
      <p className="mt-1 text-slate-600">Drafts that creators have fixed and sent. Highest risk first.</p>

      {waiting === null ? (
        <p className="mt-6 text-slate-600">Loading…</p>
      ) : waiting.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-slate-600">
          Nothing waiting yet. Switch to <strong>Creator</strong>, check a sample post and click <strong>Send for approval</strong> — it will appear here.
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {waiting.map((d) => (
            <li key={d.id}>
              <Link href={`/approvals/${d.id}`} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-300">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {d.kind === "image" && <span className="mr-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-normal">🖼️ Image</span>}
                    {d.title}
                  </p>
                  <p className="text-sm text-slate-500">
                    {d.channel} · {d.issues} issue(s) found{d.disputes > 0 ? ` · ${d.disputes} disputed` : ""} · sent {new Date(d.created_at).toLocaleString()}
                  </p>
                </div>
                <RiskBadge level={d.risk_level} size="sm" />
                <span className="text-sm font-semibold text-indigo-700">Review →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Recently decided</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {done.map((d) => (
              <li key={d.id}>
                <Link href={`/approvals/${d.id}`} className="text-indigo-700 underline">
                  {d.title}
                </Link>{" "}
                — {d.status === "approved" ? "✅ approved" : "↩️ changes requested"}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
