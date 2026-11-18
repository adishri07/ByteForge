// Builds the corrected text: each accepted finding's words are replaced by the
// suggested fix, each edited finding's words by the creator's own text.
// Pure function, so it works on the server and in the browser preview.
// Owner: Member 2

type FixLike = {
  span_text: string;
  suggested_fix: string | null;
  status: string;
  user_text: string | null;
};

export function applyFixes(content: string, findings: FixLike[]): { text: string; applied: number } {
  let text = content;
  let applied = 0;
  // longest spans first so a short span doesn't break a longer one
  const sorted = [...findings].sort((a, b) => b.span_text.length - a.span_text.length);
  for (const f of sorted) {
    let replacement: string | null = null;
    if (f.status === "accepted" && f.suggested_fix !== null) replacement = f.suggested_fix;
    if (f.status === "edited" && f.user_text !== null) replacement = f.user_text;
    if (replacement === null) continue;
    const i = text.indexOf(f.span_text);
    if (i === -1) continue;
    text = text.slice(0, i) + replacement + text.slice(i + f.span_text.length);
    applied++;
  }
  // tidy double spaces left by removed words
  text = text.replace(/ {2,}/g, " ").replace(/ ([.,!?])/g, "$1");
  return { text, applied };
}
