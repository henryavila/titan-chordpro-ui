---
date: 2026-09-24T07:48:59-0300
topic: versoes-cifra-f0-fix9
artifact: f6eef96..a10df0f
skill: review-code
provider: local
final_verdict: findings_exist
counts_final: {blocker: 0, critical: 0, major: 2, minor: 0, nit: 0}
---

# Local review — versoes-cifra F0 fix9

1. major src/core/charts.ts:357 — later composer is deleted and the earlier exact artist remains.
2. major src/core/charts.ts:414 — a non-lyric directive before a blank between sound keys leaves that blank on the lyric.
