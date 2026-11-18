# BrandProof — by Team ByteForge

**Live demo:** _add your Vercel link here_

BrandProof checks content **before it is published**. You paste a post, ad, email or document, and it is checked against an organisation's **brand rules, approved facts and terminology**. Every issue comes back with **the exact rule it breaks and a suggested fix**, and a **human manager makes the final approval**.

Built for CodeZen India 2026 (We Code Coders), problem statement by Inkloom AI.

## Try it in 1 minute
1. Open the live link and click **Try as Content Creator** (no sign-up).
2. Pick a sample, e.g. **"Risky advertisement"**, and click **Check content**.
3. Read each issue (the rule it breaks plus a fix). Accept, edit or dispute it, then click **Send for approval**.
4. Switch to **Manager** (top right), open the draft, and click **Approve** or **Request changes**.

The demo uses a fictional brand, **BrightPath Learning** (see `/brand` in the app or `data/brand-guidelines.md`).

## How it works
1. **Rule checks (code, no AI):** banned words, competitor names, brand-name spelling, ALL CAPS, "!!!", emoji limit, long sentences.
2. **Claim checks (code):** numbers, "#1", "best", "guaranteed" and "100%" are matched against the Approved Facts list. A claim is either supported, **outdated** (the fact has expired) or **unsupported**.
3. **AI check (Google Gemini):** tone, messaging and misleading claims. The AI only sees the brand's rules and facts, and must return structured JSON citing a rule or fact id.
4. **Citation validator ("cite or don't flag"):** any AI finding that cites a rule or fact that doesn't exist, or quotes text that isn't in the draft, is dropped.
5. **Risk level:** Low, Medium, High or Critical, with the reasons listed.
6. **Human workflow:** the creator accepts, edits or disputes each issue, the corrected version is saved, and a manager approves or requests changes. Every step is written to a history log.

## Tech stack
- **Next.js 16** (App Router, TypeScript, Tailwind CSS): the screens and API routes in one app
- **Supabase** (PostgreSQL): rules, terms, facts, drafts, versions, findings, audit log
- **Google Gemini API** (`@google/genai`, Flash model, JSON schema output, temperature 0)
- **Vercel**: hosting

## Run locally
```
npm install
cp .env.example .env.local     # then fill in the 3 values
npm run dev                    # open http://localhost:3000
```
Database: in Supabase → SQL Editor, run `supabase/schema.sql`, then `supabase/seed.sql`. `supabase/reset.sql` deletes all test drafts.

Accuracy test: `node scripts/run-tests.mjs <app-url>` runs `tests/test-drafts.json` and prints the detection rate.

## Project structure
| Path | What it is |
|---|---|
| `lib/ai.ts`, `lib/validator.ts`, `lib/orchestrator.ts`, `app/api/review` | AI check, citation validator, review pipeline |
| `lib/ruleEngine.ts`, `lib/claims.ts`, `lib/risk.ts`, `lib/applyFixes.ts`, `app/api/drafts`, `app/api/findings`, `app/api/brand` | Rule and claim checks, risk scoring, workflow APIs |
| `supabase/`, `lib/db.ts`, `lib/role.ts`, `app/api/role` | Database, demo roles |
| `app/submit`, `app/drafts/[id]`, `components/FindingCard.tsx` … | Creator screens |
| `app/page.tsx`, `app/approvals`, `app/brand`, `app/my-drafts`, `components/NavBar.tsx` | Home and manager screens |
| `samples/`, `tests/`, `scripts/run-tests.mjs`, `data/` | Demo brand, samples, accuracy tests |

## Known limitations (Round 2)
- Demo roles via "Try as" buttons instead of real accounts (full auth and per-organisation workspaces planned for Round 3).
- Text content only; image and visual checks are planned for Round 3.
- One demo brand; guideline upload with automatic rule extraction is planned for Round 3.

## Disclosure
AI checks use Google Gemini. AI coding assistance (Claude) was used to help write parts of this codebase; the team reviewed, tested and is responsible for all code.
