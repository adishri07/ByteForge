"use client";
// Brand Manager: upload a brand guideline (PDF / DOCX / TXT) to create a new brand.
// Owner: Member 5
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useClientRole } from "../../lib/clientRole";

type Upload = { id: string; filename: string; status: string; error: string | null; created_at: string; workspaces: { name: string } | null };

const STATUS: Record<string, string> = {
  processing: "⏳ Processing",
  review: "📝 Waiting for your review",
  approved: "✅ Approved and live",
  failed: "⚠️ Failed",
};
const STEPS = ["Reading your guideline…", "Extracting rules, words, facts and colours…", "Checking the rules for contradictions…"];

export default function GuidelinesPage() {
  const router = useRouter();
  const role = useClientRole();
  const [brandName, setBrandName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [uploads, setUploads] = useState<Upload[] | null>(null);
  const [drag, setDrag] = useState(false);

  useEffect(() => {
    fetch("/api/guidelines")
      .then((r) => r.json())
      .then((d) => setUploads(Array.isArray(d) ? d : []))
      .catch(() => setUploads([]));
  }, []);

  // rotate the progress message while the server works
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 9000);
    return () => clearInterval(t);
  }, [busy]);

  const choose = (f: File | null | undefined) => {
    setError("");
    if (!f) return;
    if (!/\.(pdf|docx|txt|md)$/i.test(f.name)) return setError("Please choose a PDF, DOCX or TXT file.");
    if (f.size > 4 * 1024 * 1024) return setError("The file is larger than 4 MB. Please upload a smaller file.");
    setFile(f);
    if (!brandName) setBrandName(f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\b(brand|guideline[s]?|style ?guide)\b/gi, "").trim().slice(0, 60));
  };

  const upload = async () => {
    if (busy || !file) return;
    setBusy(true);
    setStep(0);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("brandName", brandName);
      const res = await fetch("/api/guidelines", { method: "POST", body: form });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Upload failed. Please try again.");
      router.push(`/guidelines/${d.uploadId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
      setBusy(false);
    }
  };

  if (role !== "manager") {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-bold">Guidelines are managed by Brand Managers</h1>
        <p className="mt-2 text-slate-600">Uploading and approving a brand&apos;s rulebook is a manager task.</p>
        <a href="/api/role?as=manager&next=/guidelines" className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white">
          Switch to Brand Manager
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">Add a brand from its guideline</h1>
      <p className="mt-1 text-slate-600">
        Upload your brand or style guideline. BrandProof extracts numbered rules, banned and preferred words, approved facts and brand colours, and
        flags rules that contradict each other. <strong>Nothing is enforced until you review and approve it.</strong>
      </p>

      <div className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label
          htmlFor="file"
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            choose(e.dataTransfer.files?.[0]);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center ${drag ? "border-indigo-500 bg-indigo-50" : "border-slate-300 hover:border-indigo-300"}`}
        >
          <span className="text-3xl" aria-hidden>
            📄
          </span>
          <span className="mt-2 font-semibold">{file ? file.name : "Drag your guideline here, or click to choose"}</span>
          <span className="text-sm text-slate-500">PDF, DOCX or TXT · up to 4 MB</span>
          <input id="file" type="file" accept=".pdf,.docx,.txt,.md" className="sr-only" onChange={(e) => choose(e.target.files?.[0])} />
        </label>

        <div>
          <label htmlFor="brandName" className="block text-sm font-semibold">
            Brand name
          </label>
          <input id="brandName" value={brandName} maxLength={60} onChange={(e) => setBrandName(e.target.value)} placeholder="e.g. Chai & Co." className="mt-1 w-full rounded-lg border border-slate-300 p-2" />
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        )}

        <button
          onClick={upload}
          disabled={busy || !file || brandName.trim().length < 2}
          className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? `${STEPS[step]} (about 30–60 seconds)` : "Upload and extract rules"}
        </button>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Past uploads</h2>
        {uploads === null ? (
          <p className="mt-2 text-slate-600">Loading…</p>
        ) : uploads.length === 0 ? (
          <p className="mt-2 text-slate-600">No guidelines uploaded yet. The demo brand BrightPath Learning was set up for you.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {uploads.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{u.workspaces?.name ?? "Brand"}</p>
                  <p className="text-slate-500">
                    {u.filename} · {new Date(u.created_at).toLocaleString()}
                  </p>
                  {u.status === "failed" && u.error && <p className="text-red-700">{u.error}</p>}
                </div>
                <span>{STATUS[u.status] ?? u.status}</span>
                {u.status !== "failed" && u.status !== "processing" && (
                  <Link href={`/guidelines/${u.id}`} className="font-semibold text-indigo-700 underline">
                    {u.status === "review" ? "Review →" : "View"}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
