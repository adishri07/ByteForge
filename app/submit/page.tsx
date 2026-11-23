"use client";
// Check content before publishing: paste TEXT or upload an IMAGE, with "Ask BrandProof" beside it.
// Supports ?from=<draftId> (revise), ?prefill=<text> (from the chat), ?tab=image.
// Owner: Member 4
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ChatPanel from "../../components/ChatPanel";
import samples from "../../samples/samples.json";
import imageSamples from "../../samples/image-samples.json";

const CHANNELS = ["Instagram", "LinkedIn", "Email", "Advertisement", "Website"];
const DEMO_WS = "00000000-0000-0000-0000-000000000001";
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_IMAGE = 4 * 1024 * 1024;

export default function SubmitPage() {
  return (
    <Suspense fallback={<p className="text-slate-600">Loading…</p>}>
      <SubmitInner />
    </Suspense>
  );
}

function SubmitInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState<"text" | "image">(params.get("tab") === "image" ? "image" : "text");
  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState("Instagram");
  const [content, setContent] = useState(params.get("prefill") ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [altText, setAltText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [brand, setBrand] = useState<{ id: string; name: string } | null>(null);
  const [showChat, setShowChat] = useState(false);

  // which brand am I checking against?
  useEffect(() => {
    fetch("/api/workspaces")
      .then((r) => r.json())
      .then((d) => {
        const ws = d.workspaces?.find((w: { id: string }) => w.id === d.current);
        if (ws) setBrand({ id: ws.id, name: ws.name });
      })
      .catch(() => {});
  }, []);

  // "Revise and re-check": pre-fill the latest version of an earlier draft
  useEffect(() => {
    const from = params.get("from");
    if (!from) return;
    fetch(`/api/drafts/${from}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.draft) return;
        setTitle(`${d.draft.title} (revised)`);
        setChannel(d.draft.channel);
        setContent(d.versions[d.versions.length - 1]?.content ?? "");
      })
      .catch(() => {});
  }, [params]);

  // free the preview image memory when it changes
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const chooseFile = (f: File | null) => {
    setError("");
    if (!f) return;
    if (!IMAGE_TYPES.includes(f.type)) return setError("Please choose a PNG, JPG or WebP image.");
    if (f.size > MAX_IMAGE) return setError("The image is larger than 4 MB. Please use a smaller image.");
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  };

  const pickImageSample = async (s: (typeof imageSamples)[number]) => {
    try {
      const blob = await (await fetch(s.src)).blob();
      chooseFile(new File([blob], s.src.split("/").pop() ?? "sample.png", { type: blob.type || "image/png" }));
      setTitle(s.title);
      setChannel(s.channel);
      setAltText(s.alt_text);
    } catch {
      setError("Couldn't load that sample. Please try another.");
    }
  };

  const check = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      let res: Response;
      if (tab === "text") {
        res = await fetch("/api/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, channel, content }),
        });
      } else {
        if (!file) throw new Error("Please choose an image first.");
        const form = new FormData();
        form.append("image", file);
        form.append("title", title);
        form.append("channel", channel);
        form.append("alt_text", altText);
        res = await fetch("/api/review-image", { method: "POST", body: form });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      router.push(`/drafts/${data.draftId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setLoading(false);
    }
  };

  const canCheck = tab === "text" ? content.trim().length >= 3 : !!file;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Check content before publishing</h1>
          <p className="mt-1 text-slate-600">
            Checking against the rulebook of <strong>{brand?.name ?? "your brand"}</strong>. Paste text or upload an image.
          </p>
        </div>
        <button onClick={() => setShowChat((v) => !v)} className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-800">
          {showChat ? "Hide" : "💬 Ask BrandProof"}
        </button>
      </div>

      <div className={`mt-6 grid gap-6 ${showChat ? "lg:grid-cols-5" : ""}`}>
        <div className={showChat ? "lg:col-span-3" : ""}>
          <div role="tablist" aria-label="Content type" className="inline-flex rounded-xl bg-slate-100 p-1">
            {(["text", "image"] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => {
                  setTab(t);
                  setError("");
                }}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === t ? "bg-white text-indigo-700 shadow" : "text-slate-600"}`}
              >
                {t === "text" ? "📝 Text" : "🖼️ Image"}
              </button>
            ))}
          </div>

          {/* samples */}
          {tab === "text" && brand?.id === DEMO_WS && (
            <section className="mt-4" aria-labelledby="samples-heading">
              <h2 id="samples-heading" className="text-sm font-semibold text-slate-700">
                No content handy? Try a sample:
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {samples.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => {
                      setTitle(s.title);
                      setChannel(s.channel);
                      setContent(s.content);
                      setError("");
                    }}
                    className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm text-indigo-800 hover:bg-indigo-100"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </section>
          )}
          {tab === "image" && brand?.id === DEMO_WS && imageSamples.length > 0 && (
            <section className="mt-4" aria-labelledby="img-samples-heading">
              <h2 id="img-samples-heading" className="text-sm font-semibold text-slate-700">
                Try a sample image:
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {imageSamples.map((s) => (
                  <button key={s.label} onClick={() => pickImageSample(s)} className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm text-indigo-800 hover:bg-indigo-100">
                    {s.label}
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label htmlFor="title" className="block text-sm font-semibold">
                  Title
                </label>
                <input id="title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Diwali offer post" className="mt-1 w-full rounded-lg border border-slate-300 p-2" />
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

            {tab === "text" ? (
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
            ) : (
              <div className="space-y-4">
                <div>
                  <label htmlFor="image" className="block text-sm font-semibold">
                    Image (PNG, JPG or WebP, up to 4 MB)
                  </label>
                  <input
                    id="image"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
                    className="mt-1 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:font-semibold file:text-indigo-700"
                  />
                  {previewUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl} alt="Preview of the image you chose" className="mt-3 max-h-72 rounded-lg border border-slate-200 object-contain" />
                  )}
                </div>
                <div>
                  <label htmlFor="alt" className="block text-sm font-semibold">
                    Alt text <span className="font-normal text-slate-500">(describe the image for screen-reader users — optional, we&apos;ll suggest one)</span>
                  </label>
                  <input id="alt" value={altText} maxLength={500} onChange={(e) => setAltText(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2" />
                </div>
              </div>
            )}

            {error && (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
                {error}
              </p>
            )}

            <button
              onClick={check}
              disabled={loading || !canCheck}
              className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? tab === "text"
                  ? "Checking against your brand rules… (about 10 seconds)"
                  : "Reading the image and checking it… (about 20 seconds)"
                : tab === "text"
                  ? "Check content"
                  : "Check image"}
            </button>
          </div>
        </div>

        {showChat && (
          <aside className="lg:col-span-2">
            <ChatPanel compact />
          </aside>
        )}
      </div>
    </div>
  );
}
