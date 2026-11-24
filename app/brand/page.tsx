"use client";
// The current brand's rulebook (rules, facts, words) plus its colours and logo.
// Managers can add/remove colours and upload the approved logo.
// Owner: Member 5
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Brand } from "../../lib/types";
import { useClientRole } from "../../lib/clientRole";

const today = new Date().toISOString().slice(0, 10);
type Asset = { id: string; label: string | null; value: string };

export default function BrandPage() {
  const role = useClientRole();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [colors, setColors] = useState<Asset[]>([]);
  const [logo, setLogo] = useState<{ id: string; url: string } | null>(null);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [label, setLabel] = useState("");
  const [hex, setHex] = useState("#");
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    fetch("/api/brand")
      .then(async (r) => (r.ok ? setBrand(await r.json()) : setLoadError("Could not load the brand rules.")))
      .catch(() => setLoadError("Could not load the brand rules."));
    fetch("/api/assets")
      .then((r) => r.json())
      .then((d) => {
        setColors(d.colors ?? []);
        setLogo(d.logo ?? null);
      })
      .catch(() => {});
  }, [reloadKey]);

  const manager = role === "manager";

  const addColour = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/assets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "color", label, value: hex }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(d.error || "Could not add the colour.");
    setLabel("");
    setHex("#");
    reload();
  };

  const remove = async (id: string) => {
    setError("");
    const res = await fetch(`/api/assets?id=${id}`, { method: "DELETE" });
    if (!res.ok) setError((await res.json().catch(() => ({}))).error || "Could not remove it.");
    reload();
  };

  const uploadLogo = async (f: File | undefined) => {
    if (!f || busy) return;
    setBusy(true);
    setError("");
    const form = new FormData();
    form.append("logo", f);
    const res = await fetch("/api/assets", { method: "POST", body: form });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(d.error || "Could not upload the logo.");
    reload();
  };

  if (loadError) return <p className="rounded-lg bg-red-50 p-4 text-red-800">{loadError}</p>;
  if (!brand) return <p className="text-slate-600">Loading brand rules…</p>;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold">{brand.name} — brand rulebook</h1>
        <p className="mt-1 text-slate-600">
          Every issue BrandProof raises cites one of these rules (R-… or V-… for images) or approved facts (F-…).{" "}
          {manager && (
            <Link href="/guidelines" className="font-semibold text-indigo-700 underline">
              Add another brand from a guideline
            </Link>
          )}
        </p>
      </div>

      {brand.rules.length === 0 && (
        <p className="rounded-xl bg-amber-50 p-4 text-amber-900">
          This brand has no approved rules yet. A Brand Manager needs to approve its uploaded guideline on the{" "}
          <Link href="/guidelines" className="font-semibold underline">
            Guidelines
          </Link>{" "}
          page.
        </p>
      )}

      <section aria-labelledby="visual-h">
        <h2 id="visual-h" className="mb-3 text-lg font-semibold">
          Colours and logo
        </h2>
        {error && (
          <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 md:col-span-2">
            <h3 className="font-semibold">Approved palette</h3>
            {colors.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">No colours yet — image colour checks are skipped until you add some.</p>
            ) : (
              <ul className="mt-3 flex flex-wrap gap-3">
                {colors.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 text-sm">
                    <span className="h-8 w-8 rounded border border-slate-300" style={{ backgroundColor: c.value }} aria-hidden />
                    <span>
                      <span className="block font-semibold">{c.label}</span>
                      <span className="font-mono text-xs">{c.value}</span>
                    </span>
                    {manager && (
                      <button onClick={() => remove(c.id)} aria-label={`Remove ${c.label}`} className="ml-1 text-slate-400 hover:text-red-700">
                        ✕
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {manager && (
              <div className="mt-4 flex flex-wrap items-end gap-2 text-sm">
                <label>
                  <span className="block text-xs font-semibold">Name</span>
                  <input value={label} maxLength={40} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Sky Blue" className="rounded-lg border border-slate-300 p-2" />
                </label>
                <label>
                  <span className="block text-xs font-semibold">Hex code</span>
                  <input value={hex} maxLength={7} onChange={(e) => setHex(e.target.value)} className="w-28 rounded-lg border border-slate-300 p-2 font-mono" />
                </label>
                <input type="color" aria-label="Pick a colour" value={/^#[0-9a-f]{6}$/i.test(hex) ? hex : "#000000"} onChange={(e) => setHex(e.target.value)} className="h-10 w-10" />
                <button onClick={addColour} disabled={busy || !/^#?[0-9a-f]{6}$/i.test(hex)} className="rounded-lg bg-indigo-600 px-3 py-2 font-semibold text-white disabled:opacity-40">
                  Add colour
                </button>
              </div>
            )}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="font-semibold">Approved logo</h3>
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo.url} alt={`${brand.name} approved logo`} className="mt-3 max-h-28 rounded border border-slate-100 object-contain" />
            ) : (
              <p className="mt-2 text-sm text-slate-600">No logo yet — images are checked only for whether a logo is present.</p>
            )}
            {manager && (
              <label className="mt-3 inline-block cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50">
                {busy ? "Uploading…" : logo ? "Replace logo" : "Upload logo"}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => uploadLogo(e.target.files?.[0])} />
              </label>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="rules-h">
        <h2 id="rules-h" className="mb-3 text-lg font-semibold">
          Rules
        </h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">Category</th>
                <th className="p-3">Rule</th>
                <th className="p-3">Severity</th>
              </tr>
            </thead>
            <tbody>
              {brand.rules.map((r) => (
                <tr key={r.id} id={r.id} className="border-t border-slate-100">
                  <td className="p-3 font-mono font-semibold">{r.id}</td>
                  <td className="p-3 capitalize">{r.category}</td>
                  <td className="p-3">{r.text}</td>
                  <td className="p-3 capitalize">{r.severity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="facts-h">
        <h2 id="facts-h" className="mb-3 text-lg font-semibold">
          Approved facts
        </h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">Claim</th>
                <th className="p-3">Source</th>
                <th className="p-3">Valid until</th>
              </tr>
            </thead>
            <tbody>
              {brand.facts.map((f) => (
                <tr key={f.id} id={f.id} className="border-t border-slate-100">
                  <td className="p-3 font-mono font-semibold">{f.id}</td>
                  <td className="p-3">{f.claim}</td>
                  <td className="p-3 text-slate-600">{f.source}</td>
                  <td className="p-3">
                    {f.expires_on < today ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">Expired {f.expires_on}</span>
                    ) : (
                      f.expires_on
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="terms-h">
        <h2 id="terms-h" className="mb-3 text-lg font-semibold">
          Words
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(["banned", "competitor", "misspelling", "preferred"] as const).map((type) => (
            <div key={type} className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="font-semibold capitalize">{type === "misspelling" ? "Brand-name spellings" : type === "competitor" ? "Competitor names" : type === "preferred" ? "Preferred words" : "Avoid"}</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {brand.terms
                  .filter((t) => t.type === type)
                  .map((t) => (
                    <li key={t.id}>
                      {type === "preferred" ? <span className="text-green-800">{t.term}</span> : <del className="text-red-700">{t.term}</del>}
                      {t.replacement && (
                        <>
                          {" "}→ <span className="text-green-800">{t.replacement}</span>
                        </>
                      )}{" "}
                      <span className="font-mono text-xs text-slate-500">{t.rule_id}</span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
