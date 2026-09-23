---
date: 2026-09-23T14:45:00Z
topic: versoes-cifra-f0
artifact: 742f839..d9b5d22
skill: review-code
reviewer: local-explore
provider: local
mode: local
final_verdict: findings_exist
counts_final: {blocker: 1, critical: 1, major: 3, minor: 0, nit: 0}
---

# Local review — versoes-cifra F0 after readMeta

Ref `742f839..d9b5d22`, product paths `src/` and `tests/` only. Sealed briefing. No fixes applied. Not a `mode: both` receipt.

verdict: findings_exist
total_findings: 5
counts: blocker=1 critical=1 major=3 minor=0
passes: 2

| # | Summary | Severity | File:line |
|---|---------|----------|-----------|
| 1 | Parsed line indexes no longer address the file the editor writes | blocker | src/core/parse.ts:306 |
| 2 | Two-arg writeMeta on an envelope cannot clear a key that the caller deleted | critical | src/core/import-chordpro.ts:434 |
| 3 | Unknown chartId silently renders the default chart | major | src/core/charts.ts:264 |
| 4 | Export still rewrites every chart in the file | major | src/core/export-cho.ts:10 |
| 5 | A non-slug start_of_x_chart is treated as no envelope | major | src/core/charts.ts:187 |

## Mechanisms

1. `parse` sets `view.source` and `li0`/`li1` from `chartDocument`. `useBlockEdit` splices those indexes into the full file (`useBlockEdit.ts:93`). A lyric edit on the non-first chart can overwrite `{start_of_x_chart}`.
2. N>1 `writeMeta` only changes keys present on the object (`applyPatch` at `charts.ts:304`). `setAudioUrl` (`audio-url.ts:65`) and `applyCifraClubEnrich` (`import-chordpro.ts:1163`) `delete` the key. `writeStrumPatterns` sets `''` and does clear. One-chart files still clear via `writeMetaOneHeader`.
3. `resolveChartId` returns `defaultId` when the id is missing. Writes with an unknown id return the file unchanged.
4. `exportCho` global-replaces chords, `{key:}`, and `{capo:}` in the whole file.
5. An id outside `[a-z0-9_][a-z0-9_-]{0,63}` is dropped. If no chart remains, `hasEnvelope` is false and `writeMetaOneHeader` collapses canonical keys.

## Checklist

| Item | Status |
|------|--------|
| Logic bugs | finding 1, 2, 5 |
| Race conditions | ok |
| Error handling | finding 3, 5 |
| Schema/migrations | ok |
| API contracts | finding 2, 3 |
| File references | finding 1, 4 |
| Test coverage | finding 1, 2 |
