"use client";
// One issue: what's wrong, why, which rule, before → after, and Accept / Edit / Dispute.
// Owner: Member 4
import Link from "next/link";
import { useState } from "react";
import type { SavedFinding } from "../lib/types";

const SEVERITY_STYLE: Record<string, string> = {
  blocker: "bg-red-100 text-red-800",
  warning: "bg-orange-100 text-orange-900",
  suggestion: "bg-yellow-100 text-yellow-900",
};
const STATUS_LABEL: Record<string, string> = {
  accepted: "✓ Fix accepted",
  edited: "✎ Edited by you",
  disputed: "⚑ Disputed",
};

type Props = {
  finding: SavedFinding;
  sourceText: string; // the rule or fact text this issue cites
  readOnly?: boolean;
  onAction?: (action: "accept" | "edit" | "dispute" | "reopen", payload?: { userText?: string; reason?: string }) => Promise<void>;
};

export default function FindingCard({ finding: f, sourceText, readOnly, onAction }: Props) {
  const [mode, setMode] = useState<"none" | "edit" | "dispute">("none");
  const [text, setText] = useState(f.suggested_fix ?? f.span_text);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const cite = f.rule_id ?? f.fact_id;
  const run = async (action: "accept" | "edit" | "dispute" | "reopen", payload?: { userText?: string; reason?: string }) => {
    if (!onAction) return;
    setBusy(true);
    try {
      await onAction(action, payload);
      setMode("none");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article
      id={`finding-${f.id}`}
      className={`scroll-mt-24 rounded-xl border bg-white p-4 shadow-sm ${f.status !== "open" ? "border-slate-200 opacity-90" : "border-slate-300"}`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full px-2 py-0.5 font-semibold uppercase ${SEVERITY_STYLE[f.severity]}`}>{f.severity}</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 capitalize text-slate-700">{f.category}</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">{f.source === "rule" ? "Rule check" : "AI check"}</span>
        {f.status !== "open" && (
          <span className="ml-auto rounded-full bg-blue-50 px-2 py-0.5 font-semibold text-blue-800">{STATUS_LABEL[f.status]}</span>
        )}
      </div>

      <p className="text-sm text-slate-800">
        <span className="font-semibold">Why: </span>
        {f.explanation}
      </p>

      <p className="mt-2 rounded-lg bg-slate-50 p-2 text-sm text-slate-700">
        <span className="font-semibold">Source: </span>
        <Link href="/brand" className="font-mono font-semibold text-indigo-700 underline">
          {cite}
        </Link>{" "}
        {sourceText}
      </p>

      {f.category === "visual" && <Swatches text={`${f.span_text} ${f.explanation}`} />}

      <div className="mt-3 text-sm">
        <span className="font-semibold">Change: </span>
        <del className="rounded bg-red-50 px-1 text-red-700">{f.span_text}</del>
        <span aria-hidden> → </span>
        <span className="sr-only"> to </span>
        {f.status === "edited" ? (
          <ins className="rounded bg-green-50 px-1 text-green-800 no-underline">{f.user_text || "(removed)"}</ins>
        ) : f.suggested_fix !== null ? (
          <ins className="rounded bg-green-50 px-1 text-green-800 no-underline">{f.suggested_fix || "(remove)"}</ins>
        ) : (
          <span className="italic text-slate-500">No automatic fix — use Edit to rewrite it.</span>
        )}
      </div>

      {f.status === "disputed" && f.dispute_reason && (
        <p className="mt-2 text-sm text-slate-700">
          <span className="font-semibold">Your reason: </span>
          {f.dispute_reason}
        </p>
      )}

      {!readOnly && (
        <div className="mt-3">
          {f.status === "open" && mode === "none" && (
            <div className="flex flex-wrap gap-2">
              <button
                disabled={busy || f.suggested_fix === null}
                onClick={() => run("accept")}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Accept fix
              </button>
              <button disabled={busy} onClick={() => setMode("edit")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold hover:bg-slate-50">
                Edit
              </button>
              <button disabled={busy} onClick={() => setMode("dispute")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold hover:bg-slate-50">
                Dispute
              </button>
            </div>
          )}

          {mode === "edit" && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold" htmlFor={`edit-${f.id}`}>
                Replace &quot;{f.span_text}&quot; with:
              </label>
              <textarea id={`edit-${f.id}`} value={text} onChange={(e) => setText(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 p-2 text-sm" />
              <div className="flex gap-2">
                <button disabled={busy} onClick={() => run("edit", { userText: text })} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white">
                  Save edit
                </button>
                <button onClick={() => setMode("none")} className="rounded-lg border px-3 py-1.5 text-sm">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {mode === "dispute" && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold" htmlFor={`dispute-${f.id}`}>
                Why is this not a problem? (the manager will see this)
              </label>
              <textarea
                id={`dispute-${f.id}`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="e.g. This is a direct quote from a learner's review."
                className="w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
              <div className="flex gap-2">
                <button disabled={busy || !reason.trim()} onClick={() => run("dispute", { reason })} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40">
                  Submit dispute
                </button>
                <button onClick={() => setMode("none")} className="rounded-lg border px-3 py-1.5 text-sm">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {f.status !== "open" && mode === "none" && (
            <button disabled={busy} onClick={() => run("reopen")} className="text-sm text-indigo-700 underline">
              Undo
            </button>
          )}
        </div>
      )}
    </article>
  );
}

// Shows the colours mentioned in a visual issue (e.g. "#FF0055 → #4F46E5") as small swatches.
function Swatches({ text }: { text: string }) {
  const hexes = [...new Set(text.match(/#[0-9A-Fa-f]{6}\b/g) ?? [])].slice(0, 3);
  if (hexes.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-700">
      {hexes.map((h) => (
        <span key={h} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5">
          <span className="inline-block h-3 w-3 rounded-full border border-slate-300" style={{ backgroundColor: h }} aria-hidden />
          <span className="font-mono">{h}</span>
        </span>
      ))}
    </div>
  );
}
