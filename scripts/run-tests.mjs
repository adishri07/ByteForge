// Measures how well BrandProof catches planted mistakes.
// Usage:  node scripts/run-tests.mjs https://your-app.vercel.app
//   (or)  node scripts/run-tests.mjs http://localhost:3000
// Then run supabase/reset.sql to delete the test drafts.
// Owner: Member 6
import { readFile } from "node:fs/promises";

const base = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const tests = JSON.parse(await readFile(new URL("../tests/test-drafts.json", import.meta.url), "utf8"));

let planted = 0, caught = 0, flags = 0, wrongFlags = 0;
const rows = [];

for (const [i, t] of tests.entries()) {
  const res = await fetch(`${base}/api/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: `Test ${i + 1}`, channel: "Instagram", content: t.content }),
  });
  const data = await res.json();
  const found = new Set((data.findings || []).map((f) => f.rule_id || f.fact_id));
  const expected = new Set(t.expected);

  const hit = [...expected].filter((x) => found.has(x));
  const missed = [...expected].filter((x) => !found.has(x));
  const extra = [...found].filter((x) => !expected.has(x));

  planted += expected.size; caught += hit.length; flags += found.size; wrongFlags += extra.length;
  rows.push({ test: i + 1, risk: data.riskLevel, caught: hit.join(",") || "-", missed: missed.join(",") || "-", extra: extra.join(",") || "-" });
}

console.table(rows);
console.log(`Detection rate: ${caught}/${planted} = ${((caught / Math.max(planted, 1)) * 100).toFixed(0)}%`);
console.log(`Extra flags (not planted): ${wrongFlags}/${flags} = ${((wrongFlags / Math.max(flags, 1)) * 100).toFixed(0)}%`);
console.log("Note: 'extra' flags are not always wrong — check them by hand before reporting.");
