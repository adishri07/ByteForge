# Round 3 test results — Team ByteForge
_Tested on: ____ (date/time) · App: https://byte-forge-sigma.vercel.app · Tester: Member 6_

## 1. Text checks (`node scripts/run-tests.mjs text <url>`)
| Metric | Round 2 | Round 3 |
|---|---|---|
| Detection rate | __ % | __ % |
| Extra flags (checked by hand, really wrong) | __ | __ |
Offline check of the brand-agnostic rule engine (no AI): 18/20 cases fully caught; the 2 misses are tone/colour-only rules that only the AI checks.

## 2. Image checks (`node scripts/run-tests.mjs images <url>`)
| Image | Expected | Caught | Missed | Extra | Time |
|---|---|---|---|---|---|
| On-brand poster | none | | | | |
| Risky poster | R-09 R-10 R-11 R-12 R-04 V-01 V-02 V-03 V-04 | | | | |
| Low-contrast banner | V-03 | | | | |
Code-only parts verified offline: palette check flags the red (#E11C48) and green (#16A34A) of the risky poster and nothing in the on-brand poster; contrast maths: white on navy 15.99:1 (pass), grey on white 1.42:1 (fail), yellow on red 3.71:1 (fail).

## 3. Ask BrandProof (`node scripts/run-tests.mjs chat <url>`)
| Metric | Result |
|---|---|
| Covered / not covered correct | __ /12 |
| Expected citations found | __ % |
| Invented rule numbers | 0 expected (validator drops them) |

## 4. Guideline upload (`tests/guidelines/`, see ANSWER_KEY.md)
| File | Rules / words / facts / colours | Conflicts found (of 2 planted) | Invented rules? | Time |
|---|---|---|---|---|
| chai-and-co-brand-guide.docx | | | | |
| fitkart-guidelines.pdf | | | | |

## 5. Reliability checklist (tick on the live site)
- [ ] Empty content / 1 word → clear message, no crash
- [ ] 5,001+ characters → blocked with message
- [ ] Wrong file type (e.g. .exe, .xlsx) for guideline and image → clear message
- [ ] File over 4 MB → clear message
- [ ] Scanned/empty PDF → "couldn't read text" message
- [ ] Double-click Check / Send / Approve → only one draft / one action
- [ ] Refresh on every page (drafts, approvals, guideline review) → still works
- [ ] Creator opens /guidelines → "managed by Brand Managers" screen
- [ ] Approve rulebook with an open conflict → blocked
- [ ] Brand with no rules → "no approved rules yet" message
- [ ] Chat: empty / 1,000+ chars → message; question outside rulebook → "not covered"
- [ ] Switching brand changes rules, drafts and chat answers
- [ ] Mobile width (phone) → pages usable

## 6. Bugs found and fixed
| Bug | Fixed by | Commit |
|---|---|---|
| | | |
