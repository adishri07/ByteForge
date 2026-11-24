# Round 3 test results — Team ByteForge
_Tested on: 24 Nov 2026, 5:00–5:30 PM IST · App: https://byte-forge-sigma.vercel.app (live) · Tester: Member 6 · Runner: `scripts/run-tests.mjs`_

## 1. Text checks (`node scripts/run-tests.mjs text <url>`)
| Metric | Result |
|---|---|
| Planted issues caught | **18 / 18 = 100%** |
| Extra flags (not planted) | **0 / 18 = 0%** |
| Time per check | median **3.0 s**; 17 of 20 under 5 s; 2 took ~26 s while Gemini was overloaded (app retried / switched to a backup model) |
| Risk levels | Clean drafts → Low; guarantees / "#1" / unsupported numbers → High or Critical |

Earlier runs on the same day had some "fetch failed" rows caused by the tester's Wi-Fi dropping (requests never reached the app). The runner now retries network drops; the numbers above are from a clean run.
Offline check of the brand-agnostic rule engine (no AI): 18/20 cases fully caught; the 2 misses are tone/colour-only rules that only the AI checks.

## 2. Image checks (`node scripts/run-tests.mjs images <url>`)
| Image | Expected | Caught | Missed | Extra | Time |
|---|---|---|---|---|---|
| On-brand poster | none | none | – | none | 11 s |
| Risky poster | R-09 R-10 R-11 R-12 R-04 V-01 V-02 V-03 V-04 | **all 9** | – | none | 40 s |
| Low-contrast banner | V-03 | – | V-03 | none | 45 s |

**Total: 9 / 10 planted issues = 90%, 0 extra flags.**
Known miss: on the banner, the text is so faint (contrast ≈ 1.4 : 1) that the AI image reader did not report its colours, so the contrast maths had nothing to measure. Roadmap: measure contrast directly from pixels around detected text.
Code-only parts verified offline: palette check flags the red (#E11C48) and green (#16A34A) of the risky poster and nothing in the on-brand poster; contrast maths: white on navy 15.99:1 (pass), grey on white 1.42:1 (fail), yellow on red 3.71:1 (fail).

## 3. Ask BrandProof (`node scripts/run-tests.mjs chat <url>`)
| Metric | Result |
|---|---|
| Covered / not covered correct | **12 / 12 = 100%** (all 4 questions outside the rulebook answered "not covered") |
| Expected rule citations found | **10 / 11 = 91%** (only miss: R-11 ALL CAPS in the rewrite question) |
| Rewrite given when asked | **1 / 1 = 100%** |
| Invented rule numbers shown to users | **0** (the validator drops any citation not in the rulebook) |

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
