"use client";
// Read-only view of the brand rulebook, so judges can see every cited rule is real.
// Owner: Member 5
import { useEffect, useState } from "react";
import type { Brand } from "../../lib/types";

const today = new Date().toISOString().slice(0, 10);

export default function BrandPage() {
  const [brand, setBrand] = useState<Brand | null>(null);
  useEffect(() => {
    fetch("/api/brand").then((r) => r.json()).then(setBrand);
  }, []);

  if (!brand) return <p className="text-slate-600">Loading brand rules…</p>;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold">BrightPath Learning — brand rulebook</h1>
        <p className="mt-1 text-slate-600">Every issue BrandProof raises cites one of these rules (R-…) or approved facts (F-…).</p>
      </div>

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
                <tr key={f.id} className="border-t border-slate-100">
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
        <div className="grid gap-4 sm:grid-cols-3">
          {(["banned", "competitor", "misspelling"] as const).map((type) => (
            <div key={type} className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="font-semibold capitalize">{type === "misspelling" ? "Brand-name spellings" : type === "competitor" ? "Competitor names" : "Avoid"}</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {brand.terms
                  .filter((t) => t.type === type)
                  .map((t) => (
                    <li key={t.id}>
                      <del className="text-red-700">{t.term}</del> → <span className="text-green-800">{t.replacement}</span>{" "}
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
