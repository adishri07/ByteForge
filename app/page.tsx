// Home page: what BrandProof does and how a judge can try it in 1 minute.
// Owner: Member 5
import Link from "next/link";

const STEPS = [
  { n: 1, title: "Check text or an image", text: "Try as Creator, pick a sample (try “Risky advertisement” or the 🖼️ Image tab’s “Risky poster”) and check it." },
  { n: 2, title: "Fix and send", text: "Each issue shows the rule it breaks and a fix. Accept, edit or dispute, then Send for approval." },
  { n: 3, title: "Approve as Manager", text: "Switch to Manager (top right), open the draft and Approve or Request changes." },
  { n: 4, title: "Add your own brand", text: "As Manager, open Guidelines, upload a brand PDF/DOCX, fix what was extracted, resolve conflicts and approve." },
];

const NEW = [
  { icon: "📄", title: "Guideline upload", text: "Upload a brand PDF, DOCX or TXT. Rules, words, facts and colours are extracted, contradictions flagged, and a manager approves.", href: "/guidelines" },
  { icon: "💬", title: "Ask BrandProof", text: "Ask “Can I say X?” — answers come only from your rulebook, with rule numbers, and it says when something isn’t covered.", href: "/assistant" },
  { icon: "🖼️", title: "Image checks", text: "Upload a poster or banner. We read its text, check colours against your palette, text contrast, the logo and alt text.", href: "/submit?tab=image" },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-4xl">
      <section className="rounded-3xl bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 text-white shadow-lg sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-200">BrandProof</p>
        <h1 className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">Catch off-brand content before it&apos;s published.</h1>
        <p className="mt-4 max-w-2xl text-indigo-100">
          Paste a post or upload an image. BrandProof checks it against your brand rules, approved facts and terminology, explains every issue
          with the exact rule it breaks, suggests a fix that keeps your meaning, and a human makes the final approval.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="/api/role?as=creator" className="rounded-xl bg-white px-5 py-3 font-semibold text-indigo-700 shadow hover:bg-indigo-50">
            Try as Content Creator →
          </a>
          <a href="/api/role?as=manager" className="rounded-xl border border-white/60 px-5 py-3 font-semibold text-white hover:bg-white/10">
            Try as Brand Manager
          </a>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="new-heading">
        <h2 id="new-heading" className="text-xl font-bold">
          New in this version
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {NEW.map((f) => (
            <Link key={f.title} href={f.href} className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow">
              <span className="text-2xl" aria-hidden>
                {f.icon}
              </span>
              <h3 className="mt-2 font-semibold text-indigo-700">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{f.text}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="how-heading">
        <h2 id="how-heading" className="text-xl font-bold">
          How to try it (about 2 minutes)
        </h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-2">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">{s.n}</span>
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          ["Cite or don’t flag", "Every issue points to a numbered rule or approved fact. AI findings without a real source are dropped."],
          ["Facts that expire", "Approved claims have expiry dates, so outdated numbers are caught automatically."],
          ["Humans decide", "Creators can dispute any flag, and nothing is approved without a manager’s click."],
        ].map(([t, d]) => (
          <div key={t} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h3 className="font-semibold text-indigo-700">{t}</h3>
            <p className="mt-1 text-sm text-slate-600">{d}</p>
          </div>
        ))}
      </section>

      <p className="mt-8 text-sm text-slate-500">
        The demo starts with a fictional brand, <strong>BrightPath Learning</strong>; switch brands from the 🏷️ menu at the top. See its{" "}
        <Link href="/brand" className="text-indigo-700 underline">
          brand rules and approved facts
        </Link>
        .
      </p>
    </div>
  );
}
