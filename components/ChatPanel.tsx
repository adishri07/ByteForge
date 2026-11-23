"use client";
// "Ask BrandProof" chat: answers only from the brand's rulebook, shows cited rules,
// says clearly when something isn't covered, and can send a rewrite to be checked.
// Owner: Member 4
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string; covered?: boolean; citations?: string[]; rewrite?: string | null; error?: boolean };

const EXAMPLES = ["Can I say we're the #1 app in India?", "What tone should a LinkedIn post use?", "Which numbers am I allowed to use?", "Rewrite: GUARANTEED results, join now!!!"];

export default function ChatPanel({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, busy]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    const history = messages.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "The assistant is unavailable right now.");
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer, covered: data.covered, citations: data.citations, rewrite: data.rewrite }]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", content: e instanceof Error ? e.message : "Something went wrong.", error: true }]);
    } finally {
      setBusy(false);
    }
  };

  const checkRewrite = (text: string) => {
    router.push(`/submit?prefill=${encodeURIComponent(text)}`);
  };

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="font-semibold text-slate-900">💬 Ask BrandProof</h2>
        <p className="text-xs text-slate-500">Answers only from your brand&apos;s approved rulebook, with the rule it&apos;s based on.</p>
      </div>

      <div className={`flex-1 space-y-3 overflow-y-auto p-4 ${compact ? "max-h-96" : "min-h-[320px]"}`} aria-live="polite">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-slate-600">Try a question:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((q) => (
                <button key={q} onClick={() => send(q)} className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-left text-xs text-indigo-800 hover:bg-indigo-100">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                m.role === "user" ? "bg-indigo-600 text-white" : m.error ? "bg-red-50 text-red-800" : "bg-slate-100 text-slate-900"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.role === "assistant" && !m.error && (
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  {m.covered === false && <span className="rounded-full bg-slate-300 px-2 py-0.5 text-xs font-semibold text-slate-800">Not covered by your rulebook</span>}
                  {m.citations?.map((c) => (
                    <Link key={c} href="/brand" className="rounded-full bg-white px-2 py-0.5 font-mono text-xs font-semibold text-indigo-700 underline">
                      {c}
                    </Link>
                  ))}
                </div>
              )}
              {m.rewrite && (
                <div className="mt-2 rounded-lg border border-green-200 bg-green-50 p-2 text-slate-900">
                  <p className="text-xs font-semibold uppercase text-green-800">Suggested on-brand version</p>
                  <p className="mt-1 whitespace-pre-wrap">{m.rewrite}</p>
                  <button onClick={() => checkRewrite(m.rewrite!)} className="mt-2 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
                    Check this rewrite →
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && <p className="text-sm text-slate-500">Checking your rulebook…</p>}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2 border-t border-slate-100 p-3"
      >
        <label htmlFor="chat-input" className="sr-only">
          Ask a brand question
        </label>
        <input
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={1000}
          placeholder="Ask about tone, words, claims…"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button disabled={busy || input.trim().length < 2} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
          Send
        </button>
      </form>
    </div>
  );
}
