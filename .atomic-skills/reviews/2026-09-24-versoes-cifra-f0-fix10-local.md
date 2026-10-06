---
date: 2026-09-24T08:14:52-0300
topic: versoes-cifra-f0-fix10
provider: local
final_verdict: findings_exist
counts_final: {blocker: 0, critical: 1, major: 1, minor: 1, nit: 0}
---

# Local review — fix10

1. critical src/core/charts.ts:410 — echoed readMeta artist still replaces the credit parse shows, including setAudioUrl.
2. major src/core/charts.ts:353 — later {t} / {st} replaced by the earlier exact title or subtitle.
3. minor src/core/charts.ts:379 — lastArtistCredit reads artist lines inside tab and score.
