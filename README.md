# BrandProof — by Team ByteForge

**Live demo:** https://byte-forge-sigma.vercel.app · **Repo:** https://github.com/adishri07/ByteForge

BrandProof checks content **before it is published**. Paste a post or upload an image, and it is checked against an organisation's **brand rules, approved facts, terminology, colours and logo**. Every issue comes back with **the exact rule it breaks and a suggested fix**, and a **human manager makes the final approval**.

Built for CodeZen India 2026 (We Code Coders), problem statement by Inkloom AI.

## New in Round 3
| Feature | Where | What it does |
|---|---|---|
| **Guideline upload** | Guidelines (Manager) | Upload a brand PDF, DOCX or TXT. Numbered rules, banned/preferred/competitor words, approved facts and colours are extracted. Contradicting rules are flagged. The manager edits, rejects, resolves conflicts and **approves** — nothing is enforced before approval. Each upload becomes its own brand. |
| **Ask BrandProof** | Ask BrandProof, and the side panel on Check content | Chat that answers **only from the current brand's rulebook**, cites rule/fact numbers, says **"not covered by your rulebook"** when it isn't, and can rewrite text and send it straight to **Check content**. |
| **Image checks** | Check content → 🖼️ Image | Reads the text in a poster/banner and runs all the text checks on it, plus: colours vs the approved palette, text contrast (WCAG 4.5:1), logo present / matches the approved logo, alt text present (with a suggested alt text). |
| **Multiple brands** | 🏷️ menu in the top bar | Switch between the demo brand and any uploaded brand. Checks, drafts and chat all follow the selected brand. |
| **Reliability** | everywhere | Input limits and clear error messages, empty states, double-click guards, safe refresh, brand-agnostic rule engine. |

## Try it (about 2 minutes)
1. **Text:** click **Try as Content Creator** → pick **"Risky advertisement"** → **Check content**. Accept/edit/dispute each issue → **Send for approval**.
2. **Image:** on Check content, open the **🖼️ Image** tab → **"Risky poster"** → **Check image**. You'll see guarantee/caps claims from the image text plus off-palette colours, low contrast, missing logo and missing alt text.
3. **Chat:** open **Ask BrandProof** → "Can I call our courses cheap?" (cites R-07) and "What font should I use?" (not covered).
4. **Manager:** switch to **Manager** (top right) → Approvals → open the draft → **Approve** or **Request changes**.
5. **New brand:** as Manager → **Guidelines** → upload `tests/guidelines/chai-and-co-brand-guide.docx` → review the Rules/Words/Facts/Colours tabs → resolve the 2 conflicts → **Approve rulebook** → check a post against the new brand.

The demo starts with a fictional brand, **BrightPath Learning** (`/brand` in the app, or `data/brand-guidelines.md`).

## How it works
1. **Rule checks (code, no AI):** banned words, competitor names, brand-name spelling, ALL CAPS, "!!!", emoji limit, long sentences. The engine is **brand-agnostic**: it finds the matching rule in *this* brand's rulebook by its wording, reads limits from it (e.g. "at most 2 emojis"), and skips a check if the brand has no such rule.
2. **Claim checks (code):** numbers, "#1", "best", "guaranteed", "100%" are matched against the brand's Approved Facts. A claim is supported, **outdated** (fact expired) or **unsupported**.
3. **AI check (Google Gemini):** tone, messaging and misleading claims. The AI sees only the brand's rules and facts and must return JSON citing a rule/fact id.
4. **"Cite or don't flag" validator:** any AI finding (or chat citation, or conflict) that points to a rule that doesn't exist, or quotes text that isn't there, is dropped.
5. **Guideline extraction:** text is pulled from PDF (unpdf), DOCX (mammoth) or TXT, sent to Gemini with a strict JSON schema, then cleaned in code (renumbered R-01…, F-01…, categories/severities/hex codes validated). A second Gemini pass lists contradicting rule pairs; the manager must resolve each.
6. **Image checks:** Gemini vision reads the text and text/background colours and compares the logo with the approved logo. **Decisions are made in code**: palette distance with `sharp`, WCAG contrast ratio, alt-text presence. The image text then goes through steps 1–4.
7. **Risk level** (Low/Medium/High/Critical) and **human workflow**: accept/edit/dispute, versioning, manager approval, full history log.

## Tech stack
- **Next.js 16** (App Router, TypeScript, Tailwind CSS) — screens and API routes in one app
- **Supabase** — PostgreSQL (brands/workspaces, rules, terms, facts, assets, uploads, conflicts, drafts, versions, findings, audit, chat log) and private Storage (guidelines, images, logos)
- **Google Gemini API** (`@google/genai`, `gemini-3.1-flash-lite`, JSON schema output, temperature 0, vision)
- **unpdf**, **mammoth** (document text), **sharp** (image colours)
- **Vercel** hosting

## Run locally
```
git clone https://github.com/adishri07/ByteForge.git
cd ByteForge
npm install
cp .env.example .env.local     # fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY
npm run dev                    # http://localhost:3000
```
**Database (new Supabase project):** SQL Editor → run `supabase/schema.sql`, then `supabase/seed.sql`, then `supabase/migration_round3.sql`. (An existing Round 2 database only needs `migration_round3.sql`.)

**Tests:**
```
node scripts/run-tests.mjs text   http://localhost:3000   # 20 planted text cases
node scripts/run-tests.mjs images http://localhost:3000   # 3 sample images
node scripts/run-tests.mjs chat   http://localhost:3000   # 12 chat questions (covered / not covered / citations)
```
Guideline upload tests: `tests/guidelines/` (two fictional brands with planted contradictions, see `ANSWER_KEY.md`). Results: `ROUND3_RESULTS.md`.

## Project structure
| Path | What it is |
|---|---|
| `lib/gemini.ts`, `lib/ai.ts`, `lib/validator.ts`, `lib/orchestrator.ts` | Gemini wrapper, AI check, citation validator, text + image review pipelines |
| `lib/extractRules.ts`, `lib/conflicts.ts`, `lib/chat.ts`, `lib/vision.ts` | Guideline extraction, conflict detection, rulebook chat, image reading |
| `lib/ruleLookup.ts`, `lib/ruleEngine.ts`, `lib/claims.ts`, `lib/risk.ts` | Brand-agnostic rule and claim checks, risk scoring |
| `lib/parseDocument.ts`, `lib/palette.ts`, `lib/contrast.ts`, `lib/visualChecks.ts`, `lib/saveDraft.ts` | File parsing, colour/contrast maths, visual findings, saving drafts |
| `app/api/guidelines/**`, `app/api/conflicts`, `app/api/assets`, `app/api/review-image`, `app/api/chat` | Round 3 APIs |
| `supabase/`, `lib/db.ts`, `lib/workspace.ts`, `lib/storage.ts`, `app/api/workspaces`, `app/api/workspace/select` | Database, brands/workspaces, file storage |
| `app/submit`, `app/drafts/[id]`, `app/assistant`, `components/ChatPanel.tsx`, `components/ImagePreview.tsx`, `components/FindingCard.tsx` | Creator screens |
| `app/guidelines/**`, `app/brand`, `app/approvals/**`, `app/page.tsx`, `components/NavBar.tsx`, `components/WorkspaceSwitcher.tsx` | Manager and shared screens |
| `samples/`, `public/samples/`, `tests/`, `scripts/run-tests.mjs` | Samples, test sets, test runner |

## Security notes
- All database and AI calls run on the server; the Supabase service key and Gemini key are server-only environment variables and never reach the browser. Storage bucket is private; images are shown via 1-hour signed links.
- Manager-only actions (upload, approve rulebook, edit brand assets, approve drafts) are checked on the server.

## Known limitations
- Demo roles ("Try as") instead of real accounts; anyone with the link can view every demo brand.
- Scanned (image-only) PDFs can't be read yet — we ask for a text PDF/DOCX.
- Logo matching and reading text from images depend on the AI and can miss small or stylised text.
- Very long guidelines are cut at about 60,000 characters.

## Roadmap
1. Real sign-in (Supabase Auth) with organisations, invite links and per-brand permissions.
2. OCR for scanned PDFs; guideline versioning with "what changed" diffs.
3. Integrations: Google Docs / Canva / Figma plugins and a Slack or Teams approval bot.
4. Analytics: most-broken rules, time-to-approval, rules disputed most often (to improve the rulebook).
5. Video and multi-page (carousel/PDF brochure) checks.

## Disclosure
AI checks use Google Gemini. AI coding assistance (Claude) was used to help write parts of this codebase; the team reviewed, tested and is responsible for all code.
