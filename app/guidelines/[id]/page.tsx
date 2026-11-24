"use client";
// Brand Manager reviews what the AI extracted from a guideline, fixes anything wrong,
// resolves contradicting rules, then approves the rulebook. Nothing is enforced before approval.
// Owner: Member 5
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useClientRole } from "../../../lib/clientRole";

type RuleRow = { uid: string; id: string; category: string; text: string; severity: string; status: string };
type TermRow = { id: number; term: string; type: string; replacement: string | null; rule_id: string | null; status: string };
type FactRow = { uid: string; id: string; claim: string; source: string; expires_on: string; status: string };
type ColorRow = { id: string; label: string | null; value: string; status: string };
type ConflictRow = { id: string; rule_a: string; rule_b: string; explanation: string; suggestion: string | null; status: string; resolution: string | null };
type Data = {
  upload: { id: string; filename: string; status: string; workspace_id: string; error: string | null; workspaces: { name: string } | null };
  rules: RuleRow[];
  terms: TermRow[];
  facts: FactRow[];
  colors: ColorRow[];
  conflicts: ConflictRow[];
};

const TABS = ["Rules", "Words", "Facts", "Colours", "Conflicts"] as const;
type Tab = (typeof TABS)[number];
const today = new Date().toISOString().slice(0, 10);

export default function ReviewGuidelinePage() {
  const { id } = useParams<{ id: string }>();
  const role = useClientRole();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("Rules");
  const [busy, setBusy] = useState(false);
  const [approved, setApproved] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    fetch(`/api/guidelines/${id}`)
      .then(async (r) => ({ ok: r.ok, d: await r.json() }))
      .then(({ ok, d }) => (ok ? setData(d) : setError(d.error || "Could not load this upload.")))
      .catch(() => setError("Could not load this upload."));
  }, [id, reloadKey]);

  if (error) return <p className="rounded-lg bg-red-50 p-4 text-red-800">{error}</p>;
  if (!data) return <p className="text-slate-600">Loading the extracted rulebook…</p>;

  const editable = data.upload.status === "review" && role === "manager" && !approved;
  const openConflicts = data.conflicts.filter((c) => c.status === "open").length;
  const activeRules = data.rules.filter((r) => r.status !== "rejected").length;
  const brandName = data.upload.workspaces?.name ?? "this brand";

  const patch = async (kind: string, key: string | number, body: object) => {
    setError("");
    const res = await fetch(`/api/guidelines/${id}/items`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, key, ...body }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) setError(d.error || "Could not save.");
    reload();
  };

  const resolve = async (conflictId: string, resolution: string, extra: object = {}) => {
    setError("");
    const res = await fetch(`/api/conflicts/${conflictId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolution, ...extra }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) setError(d.error || "Could not save.");
    reload();
  };

  const approve = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/guidelines/${id}/approve`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(d.error || "Could not approve.");
    setApproved(true);
    reload();
  };

  const counts: Record<Tab, number> = {
    Rules: activeRules,
    Words: data.terms.filter((t) => t.status !== "rejected").length,
    Facts: data.facts.filter((f) => f.status !== "rejected").length,
    Colours: data.colors.filter((c) => c.status !== "rejected").length,
    Conflicts: openConflicts,
  };

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/guidelines" className="text-sm text-indigo-700 underline">
        ← All guidelines
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Review rulebook: {brandName}</h1>
          <p className="text-sm text-slate-500">From {data.upload.filename}</p>
        </div>
        {data.upload.status === "approved" && <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">✅ Approved and live</span>}
      </div>

      {data.upload.status === "approved" || approved ? (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="font-semibold text-green-900">{brandName}&apos;s rulebook is live. You&apos;re now working in this brand.</p>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            <a href="/api/role?as=creator&next=/submit" className="rounded-lg bg-indigo-600 px-3 py-1.5 font-semibold text-white">
              Check content against it →
            </a>
            <Link href="/brand" className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold">
              See the brand rules
            </Link>
            <Link href="/assistant" className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold">
              Ask BrandProof about it
            </Link>
          </div>
        </div>
      ) : (
        <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          Check what the AI extracted. Edit anything that&apos;s wrong, reject anything that isn&apos;t a real rule, and resolve every conflict. Nothing
          is enforced until you click <strong>Approve rulebook</strong>.
        </p>
      )}

      {role !== "manager" && data.upload.status === "review" && (
        <p className="mt-3 text-sm text-slate-700">
          Only a Brand Manager can edit and approve.{" "}
          <a href={`/api/role?as=manager&next=/guidelines/${id}`} className="font-semibold text-indigo-700 underline">
            Switch to Manager
          </a>
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <div role="tablist" className="mt-6 flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-t-lg px-4 py-2 text-sm font-semibold ${tab === t ? "border border-b-white border-slate-200 bg-white text-indigo-700" : "text-slate-600"}`}
          >
            {t} <span className={`ml-1 rounded-full px-2 text-xs ${t === "Conflicts" && counts[t] > 0 ? "bg-red-100 text-red-800" : "bg-slate-100"}`}>{counts[t]}</span>
          </button>
        ))}
      </div>

      <div className="rounded-b-xl border border-t-0 border-slate-200 bg-white p-4">
        {tab === "Rules" && (
          <ul className="divide-y divide-slate-100">
            {data.rules.length === 0 && <li className="py-3 text-slate-600">No rules were extracted.</li>}
            {data.rules.map((r) => (
              <li key={r.uid} className={`flex flex-wrap items-start gap-3 py-3 ${r.status === "rejected" ? "opacity-50" : ""}`}>
                <span className="w-14 font-mono font-semibold">{r.id}</span>
                <div className="min-w-0 flex-1">
                  {editable && r.status !== "rejected" ? (
                    <textarea
                      aria-label={`Rule ${r.id} text`}
                      defaultValue={r.text}
                      rows={2}
                      onBlur={(e) => e.target.value.trim() !== r.text && patch("rule", r.uid, { changes: { text: e.target.value } })}
                      className="w-full rounded-lg border border-slate-200 p-2 text-sm"
                    />
                  ) : (
                    <p className={`text-sm ${r.status === "rejected" ? "line-through" : ""}`}>{r.text}</p>
                  )}
                  <p className="mt-1 text-xs capitalize text-slate-500">{r.category}</p>
                </div>
                {editable && r.status !== "rejected" ? (
                  <select aria-label={`Rule ${r.id} severity`} value={r.severity} onChange={(e) => patch("rule", r.uid, { changes: { severity: e.target.value } })} className="rounded-lg border border-slate-200 p-1 text-sm">
                    <option value="blocker">Blocker</option>
                    <option value="warning">Warning</option>
                    <option value="suggestion">Suggestion</option>
                  </select>
                ) : (
                  <span className="text-sm capitalize">{r.severity}</span>
                )}
                {editable && <RejectButton rejected={r.status === "rejected"} onClick={(reject) => patch("rule", r.uid, reject ? { reject: true } : { restore: true })} />}
              </li>
            ))}
          </ul>
        )}

        {tab === "Words" && (
          <ul className="divide-y divide-slate-100">
            {data.terms.length === 0 && <li className="py-3 text-slate-600">No banned, preferred or competitor words were found.</li>}
            {data.terms.map((t) => (
              <li key={t.id} className={`flex flex-wrap items-center gap-3 py-3 text-sm ${t.status === "rejected" ? "opacity-50 line-through" : ""}`}>
                <span className="w-28 rounded-full bg-slate-100 px-2 py-0.5 text-center text-xs capitalize">{t.type}</span>
                <span className="font-semibold">{t.term}</span>
                {t.replacement && <span>→ {t.replacement}</span>}
                {t.rule_id && <span className="font-mono text-xs text-slate-500">{t.rule_id}</span>}
                <span className="flex-1" />
                {editable && <RejectButton rejected={t.status === "rejected"} onClick={(reject) => patch("term", t.id, reject ? { reject: true } : { restore: true })} />}
              </li>
            ))}
          </ul>
        )}

        {tab === "Facts" && (
          <ul className="divide-y divide-slate-100">
            {data.facts.length === 0 && <li className="py-3 text-slate-600">No approved facts or statistics were found. Without facts, any number in a post will be flagged as unsupported.</li>}
            {data.facts.map((f) => (
              <li key={f.uid} className={`flex flex-wrap items-center gap-3 py-3 text-sm ${f.status === "rejected" ? "opacity-50" : ""}`}>
                <span className="w-14 font-mono font-semibold">{f.id}</span>
                <div className="min-w-0 flex-1">
                  <p className={f.status === "rejected" ? "line-through" : ""}>{f.claim}</p>
                  <p className="text-xs text-slate-500">{f.source}</p>
                </div>
                {editable && f.status !== "rejected" ? (
                  <label className="text-xs">
                    Valid until{" "}
                    <input type="date" defaultValue={f.expires_on} onBlur={(e) => e.target.value && e.target.value !== f.expires_on && patch("fact", f.uid, { changes: { expires_on: e.target.value } })} className="rounded border border-slate-200 p-1" />
                  </label>
                ) : (
                  <span className={f.expires_on < today ? "font-semibold text-red-700" : ""}>{f.expires_on < today ? `Expired ${f.expires_on}` : `Valid until ${f.expires_on}`}</span>
                )}
                {editable && <RejectButton rejected={f.status === "rejected"} onClick={(reject) => patch("fact", f.uid, reject ? { reject: true } : { restore: true })} />}
              </li>
            ))}
          </ul>
        )}

        {tab === "Colours" && (
          <ul className="grid gap-3 sm:grid-cols-2">
            {data.colors.length === 0 && <li className="text-slate-600">No brand colours were found. You can add them later on the Brand rules page.</li>}
            {data.colors.map((c) => (
              <li key={c.id} className={`flex items-center gap-3 rounded-xl border border-slate-200 p-3 ${c.status === "rejected" ? "opacity-50" : ""}`}>
                <span className="h-10 w-10 rounded-lg border border-slate-300" style={{ backgroundColor: c.value }} aria-hidden />
                <div className="flex-1">
                  <p className="font-semibold">{c.label || "Colour"}</p>
                  <p className="font-mono text-sm">{c.value}</p>
                </div>
                {editable && <RejectButton rejected={c.status === "rejected"} onClick={(reject) => patch("color", c.id, reject ? { reject: true } : { restore: true })} />}
              </li>
            ))}
          </ul>
        )}

        {tab === "Conflicts" && (
          <div className="space-y-4">
            {data.conflicts.length === 0 && <p className="text-slate-600">✅ No contradicting rules were found.</p>}
            {data.conflicts.map((c) => (
              <ConflictCard key={c.id} c={c} rules={data.rules} editable={editable} onResolve={resolve} />
            ))}
          </div>
        )}
      </div>

      {data.upload.status === "review" && !approved && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {openConflicts > 0 ? (
            <p className="mb-2 text-sm text-red-700">Resolve the {openConflicts} conflict(s) in the Conflicts tab before approving.</p>
          ) : (
            <p className="mb-2 text-sm text-slate-600">
              {activeRules} rule(s) will become active for {brandName}. Default image rules (colours, logo, contrast, alt text) are added if the guideline
              doesn&apos;t have them.
            </p>
          )}
          <button
            onClick={approve}
            disabled={!editable || busy || openConflicts > 0 || activeRules === 0}
            className="w-full rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Approving…" : "Approve rulebook"}
          </button>
        </div>
      )}
    </div>
  );
}

function RejectButton({ rejected, onClick }: { rejected: boolean; onClick: (reject: boolean) => void }) {
  return (
    <button onClick={() => onClick(!rejected)} className={`rounded-lg border px-2 py-1 text-xs font-semibold ${rejected ? "border-slate-300 text-slate-700" : "border-red-200 text-red-700 hover:bg-red-50"}`}>
      {rejected ? "Restore" : "Reject"}
    </button>
  );
}

function ConflictCard({ c, rules, editable, onResolve }: { c: ConflictRow; rules: RuleRow[]; editable: boolean; onResolve: (id: string, resolution: string, extra?: object) => void }) {
  const [mode, setMode] = useState<"none" | "edit">("none");
  const [ruleId, setRuleId] = useState(c.rule_a);
  const [text, setText] = useState("");
  const ruleText = (code: string) => rules.find((r) => r.id === code)?.text ?? "";

  return (
    <div className={`rounded-xl border p-4 ${c.status === "open" ? "border-red-200 bg-red-50/40" : "border-slate-200"}`}>
      <div className="grid gap-3 md:grid-cols-2">
        {[c.rule_a, c.rule_b].map((code) => (
          <div key={code} className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="font-mono text-sm font-semibold">{code}</p>
            <p className="text-sm">{ruleText(code)}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm">
        <span className="font-semibold">Why they clash: </span>
        {c.explanation}
      </p>
      {c.suggestion && (
        <p className="mt-1 text-sm text-slate-700">
          <span className="font-semibold">Suggestion: </span>
          {c.suggestion}
        </p>
      )}

      {c.status === "resolved" ? (
        <p className="mt-3 text-sm font-semibold text-green-800">✓ {c.resolution}</p>
      ) : editable ? (
        mode === "none" ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => onResolve(c.id, "keep_a")} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white">
              Keep {c.rule_a}
            </button>
            <button onClick={() => onResolve(c.id, "keep_b")} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white">
              Keep {c.rule_b}
            </button>
            <button
              onClick={() => {
                setMode("edit");
                setText(c.suggestion ?? ruleText(c.rule_a));
              }}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold"
            >
              Rewrite one
            </button>
            <button onClick={() => onResolve(c.id, "keep_both")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
              Not a real conflict
            </button>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <label className="block text-sm font-semibold">
              Rewrite{" "}
              <select value={ruleId} onChange={(e) => setRuleId(e.target.value)} className="rounded border border-slate-300 p-1 text-sm">
                <option value={c.rule_a}>{c.rule_a}</option>
                <option value={c.rule_b}>{c.rule_b}</option>
              </select>{" "}
              as:
            </label>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 p-2 text-sm" />
            <div className="flex gap-2">
              <button disabled={text.trim().length < 5} onClick={() => onResolve(c.id, "edit", { ruleId, text })} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40">
                Save
              </button>
              <button onClick={() => setMode("none")} className="rounded-lg border px-3 py-1.5 text-sm">
                Cancel
              </button>
            </div>
          </div>
        )
      ) : null}
    </div>
  );
}
