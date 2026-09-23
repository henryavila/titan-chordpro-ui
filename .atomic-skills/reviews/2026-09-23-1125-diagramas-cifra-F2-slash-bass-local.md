---
verdict: approve
counts: {blocker: 0, critical: 0, major: 0, minor: 0, nit: 0}
reviewer: local
pass: local
schema_version: "1.0"
---

# F2 local review — slash bass on a piano-key tie

**Ref:** `f446c14..b9b3780`
**Files:** `src/core/chord-dict.ts`, `src/core/resolve-diagram.ts`, `tests/core/resolve-diagram.test.ts`

## What was checked

`pianoKeysToRelative` still converts when the absolute chord-tone score is higher and keeps the numbers when the relative score is higher (`src/core/chord-dict.ts:141-142`). On a tie it looks at `bassPc` only when that pitch is in exactly one of the two sounding sets (`src/core/chord-dict.ts:144-148`). `fromDefine` passes `want.bassPc` (`src/core/resolve-diagram.ts:69`). A slash token with no matching override still returns `no-shape` before the dictionary (`src/core/resolve-diagram.ts:123`).

The regression test resolves `D7M(9)/B` with piano keys `[11, 2, 1, 4]` and expects drawn pitch classes `[11, 2, 1, 4]` and note names B, D, C#, E (`tests/core/resolve-diagram.test.ts:279-293`). The relative F7sus4 case keys `[0, 5, 10]` still expects F, A#, D# (`tests/core/resolve-diagram.test.ts:261-276`). That token has no slash, so the bass branch does not run and the characteristic-tone count still decides.

## Findings

No blocker, critical, or major. When the bass pitch is in both readings, the function falls through to the characteristic count and then to absolute. That is the rule written in the function, and this diff does not claim to cover it.

## Verdict

Approve the scoped change.
