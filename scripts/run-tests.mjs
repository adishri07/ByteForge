// Measures BrandProof on planted mistakes. Three modes:
//   node scripts/run-tests.mjs text   http://localhost:3000   (tests/test-drafts.json  -> /api/review)
//   node scripts/run-tests.mjs images http://localhost:3000   (samples/image-samples.json -> /api/review-image)
//   node scripts/run-tests.mjs chat   http://localhost:3000   (tests/chat-questions.json -> /api/chat)
// Runs against the DEMO brand (BrightPath), because no brand cookie is sent.
// Text/image runs create test drafts. Do NOT run reset.sql during judging — delete test drafts by hand if needed.
// Owner: Member 6
import { readFile } from "node:fs/promises";

const mode = process.argv[2] || "text";
const base = (process.argv[3] || "http://localhost:3000").replace(/\/$/, "");
const read = async (p) => JSON.parse(await readFile(new URL(p, import.meta.url), "utf8"));
// fetch that retries twice if the network drops (college Wi-Fi), so one blip doesn't spoil a run
async function post(url, init) {
  for (let i = 0; ; i++) {
    try {
      return await fetch(url, init);
    } catch (e) {
      if (i >= 2) throw e;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}
const pct = (a, b) => `${a}/${b} = ${((a / Math.max(b, 1)) * 100).toFixed(0)}%`;

async function scoreFindings(tests, call) {
  let planted = 0, caught = 0, flags = 0, extraFlags = 0;
  const rows = [];
  for (const [i, t] of tests.entries()) {
    const started = Date.now();
    const data = await call(t, i).catch((e) => ({ error: e.message }));
    if (data.error) {
      rows.push({ test: i + 1, error: data.error });
      planted += t.expected.length;
      continue;
    }
    const found = new Set((data.findings || []).map((f) => f.rule_id || f.fact_id));
    const expected = new Set(t.expected);
    const hit = [...expected].filter((x) => found.has(x));
    const extra = [...found].filter((x) => !expected.has(x));
    planted += expected.size; caught += hit.length; flags += found.size; extraFlags += extra.length;
    rows.push({ test: i + 1, risk: data.riskLevel, caught: hit.join(",") || "-", missed: [...expected].filter((x) => !found.has(x)).join(",") || "-", extra: extra.join(",") || "-", secs: ((Date.now() - started) / 1000).toFixed(1) });
  }
  console.table(rows);
  console.log(`Detection rate: ${pct(caught, planted)}`);
  console.log(`Extra flags (not planted): ${pct(extraFlags, flags)}  — check these by hand; not all are wrong.`);
}

if (mode === "text") {
  const tests = await read("../tests/test-drafts.json");
  await scoreFindings(tests, async (t, i) => {
    const res = await post(`${base}/api/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: `Test ${i + 1}`, channel: "Instagram", content: t.content }) });
    return res.json();
  });
} else if (mode === "images") {
  const tests = await read("../samples/image-samples.json");
  await scoreFindings(tests, async (t) => {
    const bytes = await readFile(new URL(`../public${t.src}`, import.meta.url));
    const form = new FormData();
    form.append("image", new Blob([bytes], { type: "image/png" }), t.src.split("/").pop());
    form.append("title", `Test: ${t.title}`);
    form.append("channel", t.channel);
    form.append("alt_text", t.alt_text);
    const res = await post(`${base}/api/review-image`, { method: "POST", body: form });
    return res.json();
  });
} else if (mode === "chat") {
  const qs = await read("../tests/chat-questions.json");
  let coveredOk = 0, citeOk = 0, citeTotal = 0, rewriteOk = 0, rewriteTotal = 0;
  const rows = [];
  for (const [i, t] of qs.entries()) {
    let res;
    try {
      res = await post(`${base}/api/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: t.q, history: [] }) });
    } catch (e) {
      rows.push({ q: i + 1, error: e.message });
      continue;
    }
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { rows.push({ q: i + 1, error: d.error }); continue; }
    // citations come back as plain ids, e.g. ["R-07"]
    const cited = new Set((d.citations || []).map((c) => (typeof c === "string" ? c : c.id)));
    const coverMatch = Boolean(d.covered) === t.covered;
    if (coverMatch) coveredOk++;
    const hit = t.expect_rules.filter((r) => cited.has(r));
    citeOk += hit.length; citeTotal += t.expect_rules.length;
    if (t.expect_rewrite) { rewriteTotal++; if (d.rewrite) rewriteOk++; }
    rows.push({ q: i + 1, covered: `${d.covered} (want ${t.covered})`, cited: [...cited].join(",") || "-", missedCites: t.expect_rules.filter((r) => !cited.has(r)).join(",") || "-", rewrite: d.rewrite ? "yes" : "-" });
  }
  console.table(rows);
  console.log(`Covered / not-covered correct: ${pct(coveredOk, qs.length)}`);
  console.log(`Expected rule citations found: ${pct(citeOk, citeTotal)}`);
  if (rewriteTotal) console.log(`Rewrites given when asked: ${pct(rewriteOk, rewriteTotal)}`);
} else {
  console.log("Mode must be text, images or chat.");
}
