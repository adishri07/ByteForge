"use client";
// Manager's review: original vs final, what the creator did with each issue,
// Approve / Request changes, and the full history.
// Owner: Member 5
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import RiskBadge from "../../../components/RiskBadge";
import { useClientRole } from "../../../lib/clientRole";
import type { SavedFinding } from "../../../lib/types";

type Data = {
  draft: { id: string; title: string; channel: string; status: string; risk_level: string; manager_comment: string | null };
  versions: { version_no: number; content: string }[];
  findings: SavedFinding[];
  audit: { id: number; actor_role: string; action: string; comment: string | null; created_at: string }[];
};

const DID: Record<string, string> = {
  open: "Not changed",
  accepted: "✓ Accepted the fix",
  edited: "✎ Rewrote it",
  disputed: "⚑ Disputed",
};

export default function ApprovalPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Data | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const role = useClientRole();
  const [reloadKey, setReloadKey] = useState(0);
  const load = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    fetch(`/api/drafts/${id}`).then((r) => r.json()).then(setData);
  }, [id, reloadKey]);

  if (!data?.draft) return <p className="text-slate-600">Loading…</p>;
  const { draft, versions, findings, audit } = data;
  const original = versions[0]?.content ?? "";
  const final = versions[versions.length - 1]?.content ?? "";
  const pending = draft.status === "pending_approval";

  const decide = async (decision: "approve" | "request_changes") => {
    setBusy(true);
    const res = await fetch(`/api/drafts/${id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, comment }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) alert(d.error || "Could not save.");
    else load();
  };

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/approvals" className="text-sm text-indigo-700 underline">
        ← All approvals
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{draft.channel}</p>
          <h1 className="text-2xl font-bold">{draft.title}</h1>
        </div>
        <RiskBadge level={draft.risk_level} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Original (as submitted)</h2>
          <p className="whitespace-pre-wrap text-slate-800">{original}</p>
        </div>
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-green-800">Final (after creator&apos;s fixes)</h2>
          <p className="whitespace-pre-wrap text-slate-900">{final}</p>
        </div>
      </div>

      <section className="mt-8" aria-labelledby="what-h">
        <h2 id="what-h" className="text-lg font-semibold">
          What the creator did with each issue
        </h2>
        {findings.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">BrandProof found no issues in this draft.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-3">Issue</th>
                  <th className="p-3">Rule</th>
                  <th className="p-3">Creator&apos;s action</th>
                </tr>
              </thead>
              <tbody>
                {findings.map((f) => (
                  <tr key={f.id} className={`border-t border-slate-100 ${f.status === "disputed" ? "bg-amber-50" : ""}`}>
                    <td className="p-3">
                      <span className="font-semibold">&quot;{f.span_text}&quot;</span>
                      <span className="block text-slate-600">{f.explanation}</span>
                    </td>
                    <td className="p-3 font-mono">{f.rule_id ?? f.fact_id}</td>
                    <td className="p-3">
                      {DID[f.status]}
                      {f.status === "accepted" && f.suggested_fix !== null && <span className="block text-green-800">→ {f.suggested_fix || "(removed)"}</span>}
                      {f.status === "edited" && <span className="block text-green-800">→ {f.user_text}</span>}
                      {f.status === "disputed" && <span className="block text-amber-900">Reason: {f.dispute_reason}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="decide-h">
        <h2 id="decide-h" className="text-lg font-semibold">
          Decision
        </h2>
        {!pending ? (
          <p className="mt-2">
            {draft.status === "approved" ? "✅ Approved for publishing." : draft.status === "changes_requested" ? "↩️ Changes requested." : "The creator hasn't sent this draft yet."}
            {draft.manager_comment && <span className="block text-sm text-slate-600">Comment: “{draft.manager_comment}”</span>}
          </p>
        ) : role !== "manager" ? (
          <p className="mt-2 text-sm text-slate-700">
            Only a Brand Manager can approve.{" "}
            <a href={`/api/role?as=manager&next=/approvals/${id}`} className="font-semibold text-indigo-700 underline">
              Switch to Manager
            </a>
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            <label htmlFor="comment" className="block text-sm font-semibold">
              Comment (required if you request changes)
            </label>
            <textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 p-2 text-sm" />
            <div className="flex flex-wrap gap-2">
              <button disabled={busy} onClick={() => decide("approve")} className="rounded-xl bg-green-600 px-5 py-2.5 font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                Approve
              </button>
              <button
                disabled={busy || !comment.trim()}
                onClick={() => decide("request_changes")}
                className="rounded-xl border border-slate-300 px-5 py-2.5 font-semibold hover:bg-slate-50 disabled:opacity-40"
              >
                Request changes
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="mt-8" aria-labelledby="hist-h">
        <h2 id="hist-h" className="text-lg font-semibold">
          History
        </h2>
        <ol className="mt-3 space-y-3 border-l-2 border-indigo-200 pl-4">
          {audit.map((a) => (
            <li key={a.id} className="text-sm">
              <span className="font-semibold capitalize">{a.actor_role}</span> — {a.action}
              {a.comment && <span className="block text-slate-600">“{a.comment}”</span>}
              <span className="block text-xs text-slate-500">{new Date(a.created_at).toLocaleString()}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
