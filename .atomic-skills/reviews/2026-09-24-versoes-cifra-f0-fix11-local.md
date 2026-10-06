---
date: 2026-09-24T08:40:20-0300
topic: versoes-cifra-f0-fix11
provider: local
final_verdict: findings_exist
counts_final: {blocker: 0, critical: 0, major: 2, minor: 1, nit: 0}
---

# Local review — fix11

1. major src/core/charts.ts:358 — unrelated save deletes an identity line inside tab or score when the outside credit already matches parse.
2. major src/core/charts.ts:496 — a new title, subtitle, or artist is ignored when the line parse shows is inside the default chart.
3. minor src/core/charts.ts:503 — an image inside tab marks the body started, so a later blank between sound keys stays on the lyric.
