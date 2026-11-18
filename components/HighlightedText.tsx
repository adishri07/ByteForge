// Shows the draft with each flagged phrase highlighted. Clicking a highlight
// scrolls to its issue card.
import type { ReactNode } from "react";
// Owner: Member 4
type Span = { id: number; span_text: string; severity: string; status: string };

const COLORS: Record<string, string> = {
  blocker: "bg-red-200 decoration-red-600",
  warning: "bg-orange-200 decoration-orange-600",
  suggestion: "bg-yellow-200 decoration-yellow-600",
};

export default function HighlightedText({ content, findings }: { content: string; findings: Span[] }) {
  // find where each phrase is (first unused occurrence), skip overlaps
  const ranges: { start: number; end: number; f: Span }[] = [];
  for (const f of findings) {
    if (!f.span_text) continue;
    let from = 0;
    while (from < content.length) {
      const i = content.indexOf(f.span_text, from);
      if (i === -1) break;
      const end = i + f.span_text.length;
      if (!ranges.some((r) => i < r.end && end > r.start)) {
        ranges.push({ start: i, end, f });
        break;
      }
      from = i + 1;
    }
  }
  ranges.sort((a, b) => a.start - b.start);

  const parts: ReactNode[] = [];
  let pos = 0;
  for (const r of ranges) {
    if (r.start > pos) parts.push(content.slice(pos, r.start));
    const done = r.f.status !== "open";
    parts.push(
      <a
        key={r.f.id}
        href={`#finding-${r.f.id}`}
        title="Go to this issue"
        className={`rounded px-0.5 underline decoration-2 underline-offset-2 ${
          done ? "bg-slate-200 decoration-slate-400" : COLORS[r.f.severity] ?? COLORS.warning
        }`}
      >
        {content.slice(r.start, r.end)}
      </a>
    );
    pos = r.end;
  }
  if (pos < content.length) parts.push(content.slice(pos));

  return <p className="whitespace-pre-wrap leading-8 text-slate-900">{parts}</p>;
}
