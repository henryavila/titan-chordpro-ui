---
date: 2026-09-24T07:28:05-03:00
topic: versoes-cifra-f0-fix8
artifact: 24b96e9..4a657a3
skill: review-code
provider: local
reviewer: sealed-subagent
same_family_remap: false
final_verdict: findings_exist
counts_final: {blocker: 0, critical: 0, major: 1, minor: 0, nit: 0}
---

# Local review — versoes-cifra F0 fix8

Ref `24b96e9..4a657a3`. Product paths only. Sealed subagent. No fixes.

verdict: findings_exist
counts: blocker=0 critical=0 major=1 minor=0
passes: 2

| # | Summary | Severity | File:line |
|---|---------|----------|-----------|
| 1 | One-chart writeMeta leaves colonless identity and `{composer:}` in the body, so title and artist edits do not stick | major | src/core/charts.ts:348 |

`readMetaLines` now accepts colonless song identity and `{composer:}`. `writeMetaOneHeader` only drops colon-form lines that `canonicalMetaKey` knows. `{title Uma}` rewritten to Outra is read back as Uma. Renaming `{composer:Alguém}` leaves the composer line, so `readMeta` and `parse` disagree.
