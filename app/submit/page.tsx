"use client";
// Paste a post / ad / email and click "Check content".
// Owner: Member 4
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import samples from "../../samples/samples.json";

const CHANNELS = ["Instagram", "LinkedIn", "Email", "Advertisement", "Website"];

export default function SubmitPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState("Instagram");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // "Revise and re-check": /submit?from=<draftId> pre-fills the latest version
  useEffect(() => {
    const from = new URLSearchParams(window.location.search).get("from");
    if (!from) return;
    fetch(`/api/drafts/${from}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.draft) return;
        setTitle(`${d.draft.title} (revised)`);
        setChannel(d.draft.channel);
        setContent(d.versions[d.versions.length - 1]?.content ?? "");
      });
  }, []);

  const pickSample = (s: (typeof samples)[number]) => {
    setTitle(s.title);
    setChannel(s.channel);
    setContent(s.content);
    setError("");
  };

  const check = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, channel, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      router.push(`/drafts/${data.draftId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">Check content before publishing</h1>
      <p className="mt-1 text-slate-600">
        Paste a post, ad, email or web text. BrandProof checks it against BrightPath&apos;s brand rules, approved facts and terminology.
      </p>

      <section className="mt-6" aria-labelledby="samples-heading">
        <h2 id="samples-heading" className="text-sm font-semibold text-slate-700">
          No content handy? Try a sample:
        </h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {samples.map((s) => (
            <button key={s.label} onClick={() => pickSample(s)} className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm text-indigo-800 hover:bg-indigo-100">
              {s.label}
            </button>
          ))}
        </div>
      </section>

      <div className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label htmlFor="title" className="block text-sm font-semibold">
              Title
            </label>
            <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Diwali offer post" className="mt-1 w-full rounded-lg border border-slate-300 p-2" />
          </div>
          <div>
            <label htmlFor="channel" className="block text-sm font-semibold">
              Channel
            </label>
            <select id="channel" value={channel} onChange={(e) => setChannel(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2">
              {CHANNELS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="content" className="block text-sm font-semibold">
            Content
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            maxLength={5000}
            placeholder="Paste your draft here…"
            className="mt-1 w-full rounded-lg border border-slate-300 p-3"
          />
          <p className="text-right text-xs text-slate-500">{content.length}/5000</p>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        )}

        <button
          onClick={check}
          disabled={loading || content.trim().length < 3}
          className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Checking against BrightPath's brand rules… (about 10 seconds)" : "Check content"}
        </button>
      </div>
    </div>
  );
}
