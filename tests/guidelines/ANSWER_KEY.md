# Guideline test files — answer key (Member 6)

Both brands are **fictional**. Upload them on **Guidelines** (as Brand Manager). Do not show this key to the AI.

## chai-and-co-brand-guide.docx (DOCX parser)
Expect roughly 13–16 rules, 6–9 words, 3 facts, 4 colours.

| Planted conflict | Rules |
|---|---|
| Emojis: "use as many as you like" vs "never more than one emoji" | 1.3 vs 1.4 |
| Superlatives: "best in Pune" allowed vs "never use best / No. 1" | 3.3 vs 3.4 |

Words to check: "chai tea" → chai, "shop"/"stall" → café, "Chai and Co"/"ChaiCo" → Chai & Co., competitors Chaayos, Chai Point.
Colours: #2F6B3F, #F2A33A, #FFF8EC, #3B2416.
Try after approval: `Try our chai tea!!! Best in Pune, 50 lakh cups served 😀😀` → expect chai-tea word, exclamation/emoji/superlative and unsupported number (50 lakh is not an approved fact).

## fitkart-guidelines.pdf (PDF parser) — fitkart-guidelines.txt is the same text
Expect roughly 10–13 rules, 4–6 words, 2 facts, 3 colours.

| Planted conflict | Rules |
|---|---|
| Exclamation marks: "use freely" vs "at most one per post" | Voice bullets 3 vs 4 |
| Free delivery: "always mention" vs "never promise" | Offers bullets 2 vs 3 |

Try after approval: `Get a cheap Fit Kart exercise machine — guaranteed weight loss!!` → expect cheap→budget-friendly, Fit Kart→FitKart, exercise machine→home gym, guarantee, exclamations.

## What to record (ROUND3_RESULTS.md)
- Conflicts found: x/2 per file (and any extra ones — are they reasonable?)
- Rules extracted vs the expected range; any rule that was invented (not in the file) = serious error
- Time from upload to review screen
