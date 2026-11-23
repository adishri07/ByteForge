"use client";
// Results: risk level, highlighted draft, one card per issue, preview of the
// fixed text, and "Send for approval".
// Owner: Member 4
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import FindingCard from "../../../components/FindingCard";
import HighlightedText from "../../../components/HighlightedText";
import ImagePreview from "../../../components/ImagePreview";
import RiskBadge from "../../../components/RiskBadge";
import { applyFixes } from "../../../lib/applyFixes";
import type { Fact, Rule, SavedFinding } from "../../../lib/types";

type DraftData = {
  draft: {
    id: string; title: string; channel: string; status: string; risk_level: string;
    risk_reasons: string[] | null; ai_note: string | null; manager_comment: string | null;
    kind?: string; image_url?: string | null; alt_text?: string | null;
  };
  brand?: { name: string; rules: Rule[]; facts: Fact[] };
  versions: { version_no: number; content: string }[];
  findings: SavedFinding[];
};

const STATUS_TEXT: Record<string, string> = {
  pending_approval: "⏳ Sent — waiting for a Brand Manager to approve.",
  approved: "✅ Approved for publishing.",
  changes_requested: "↩️ The manager asked for changes.",
};

export default function DraftPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<DraftData | null>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [actionError, setActionError] = useState("");

  const [reloadKey, setReloadKey] = useState(0);
  const load = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    fetch(`/api/drafts/${id}`)
      .then(async (res) => ({ ok: res.ok, d: await res.json() }))
      .then(({ ok, d }) => {
        if (!ok) setError(d.error || "Could not load this draft.");
        else setData(d);
      });
  }, [id, reloadKey]);

  const brand = data?.brand;
  const sourceText = (f: SavedFinding) =>
    f.rule_id
      ? brand?.rules.find((r) => r.id === f.rule_id)?.text ?? ""
      : brand?.facts.find((x) => x.id === f.fact_id)
        ? `Approved fact: "${brand?.facts.find((x) => x.id === f.fact_id)?.claim}" (valid until ${brand?.facts.find((x) => x.id === f.fact_id)?.expires_on})`
        : "";

  const original = data?.versions[0]?.content ?? "";
  const preview = useMemo(() => (data ? applyFixes(original, data.findings).text : ""), [data, original]);

  if (error) return <p className="rounded-lg bg-red-50 p-4 text-red-800">{error}</p>;
  if (!data) return <p className="text-slate-600">Loading…</p>;

  const { draft, findings } = data;
  const editable = draft.status === "in_review_by_creator";
  const openBlockers = findings.filter((f) => f.severity === "blocker" && f.status === "open").length;
  const resolved = findings.filter((f) => f.status !== "open").length;

  const act = async (fid: number, action: string, payload?: { userText?: string; reason?: string }) => {
    const res = await fetch(`/api/findings/${fid}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setActionError(d.error || "Could not save your choice. Please try again.");
      return;
    }
    setActionError("");
    setData((prev) => (prev ? { ...prev, findings: prev.findings.map((f) => (f.id === fid ? d : f)) } : prev));
  };

  const send = async () => {
    if (sending) return;
    setSending(true);
    const res = await fetch(`/api/drafts/${id}/submit`, { method: "POST" }).catch(() => null);
    const d = res ? await res.json().catch(() => ({})) : {};
    setSending(false);
    if (!res || !res.ok) setActionError(d.error || "Could not send. Please check your connection and try again.");
    else {
      setActionError("");
      load();
    }
  };
  const isImage = draft.kind === "image";

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{draft.channel}</p>
          <h1 className="text-2xl font-bold">{draft.title}</h1>
        </div>
        <RiskBadge level={draft.risk_level} />
      </div>

      {draft.risk_reasons && draft.risk_reasons.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 rounded-xl bg-slate-100 p-4 pl-8 text-sm text-slate-700">
          {draft.risk_reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
      {draft.ai_note && <p className="mt-3 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-900">{draft.ai_note}</p>}
      {actionError && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {actionError}
        </p>
      )}

      {!editable && (
        <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <p className="font-semibold text-indigo-900">{STATUS_TEXT[draft.status]}</p>
          {draft.manager_comment && <p className="mt-1 text-sm text-slate-800">Manager&apos;s comment: “{draft.manager_comment}”</p>}
          {draft.status === "changes_requested" && (
            <Link href={isImage ? "/submit?tab=image" : `/submit?from=${draft.id}`} className="mt-2 inline-block rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white">
              {isImage ? "Upload a corrected image" : "Revise and re-check"}
            </Link>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-2" aria-labelledby="draft-heading">
          <div className="sticky top-20 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 id="draft-heading" className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                {isImage ? "Your image" : "Your draft"}
              </h2>
              {isImage ? (
                <ImagePreview url={draft.image_url ?? null} text={original} altText={draft.alt_text ?? null} />
              ) : (
                <HighlightedText content={original} findings={findings} />
              )}
            </div>
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-green-800">
                {isImage ? (editable ? "Image text after your fixes" : "Final image text sent") : editable ? "Preview after your fixes" : "Final version sent"}
              </h2>
              <p className="whitespace-pre-wrap text-slate-900">{editable ? preview : data.versions[data.versions.length - 1]?.content}</p>
            </div>
          </div>
        </section>

        <section className="lg:col-span-3" aria-labelledby="issues-heading">
          <h2 id="issues-heading" className="mb-3 text-lg font-semibold">
            {findings.length === 0 ? "No issues found 🎉" : `${findings.length} issue${findings.length > 1 ? "s" : ""} · ${resolved} resolved`}
          </h2>
          <div className="space-y-3">
            {findings.map((f) => (
              <FindingCard key={f.id} finding={f} sourceText={sourceText(f)} readOnly={!editable} onAction={(a, p) => act(f.id, a, p)} />
            ))}
          </div>

          {editable && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              {openBlockers > 0 ? (
                <p className="mb-2 text-sm text-red-700">
                  Resolve the {openBlockers} blocker issue{openBlockers > 1 ? "s" : ""} (accept, edit or dispute) before sending.
                </p>
              ) : (
                <p className="mb-2 text-sm text-slate-600">Ready to send. A Brand Manager will review your changes and any disputes.</p>
              )}
              <button
                onClick={send}
                disabled={sending || openBlockers > 0}
                className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? "Sending…" : "Send for approval"}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
