# F0 phase local review

**Ref:** `649f82957a90287f505a51a60e9c184bc9d844b2..HEAD`
**Mode:** local
**Provider:** grok
**At:** 2026-09-20T12:20:00Z
**Files:** src/core/parse-chord.ts, src/core/index.ts, tests/core/parse-chord-token.test.ts, tests/core/chord-oracle.test.ts, scripts/build-chord-oracle.mjs

verdict: findings_exist
total_findings: 3
counts: blocker=0 critical=0 major=3 minor=0
passes: 3

| # | Summary | Severity | File:line |
|---|---------|----------|-----------|
| 1 | D9/4 G9/4 classified AMBIGUOUS because first `/` is bass cut | major | src/core/parse-chord.ts:61 |
| 2 | m(3b) hard-coded AMBIGUOUS so Dm(3b)/F# is dropped | major | src/core/parse-chord.ts:50 |
| 3 | Oracle generator and parser disagree when bass invalid and left side is not a chord | major | scripts/build-chord-oracle.mjs:66 |
