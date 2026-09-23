---
date: 2026-09-23T19:30:00Z
topic: versoes-cifra-f0-fix
artifact: 6ff593c..621dfe8
skill: review-code
reviewer: local-explore
provider: local
mode: local
final_verdict: findings_exist
counts_final: {blocker: 0, critical: 0, major: 0, minor: 3, nit: 0}
---

# Local review — versoes-cifra F0 fix diff

Ref `6ff593c..621dfe8`, product paths `src/` and `tests/` only. Sealed briefing. No fixes applied. Not a `mode: both` receipt by itself.

verdict: findings_exist
total_findings: 3
counts: blocker=0 critical=0 major=0 minor=3
passes: 2

| # | Summary | Severity | File:line |
|---|---------|----------|-----------|
| 1 | Every chart-document commit rewrites the song header and drops the spacer before the first chart | minor | src/core/charts.ts:384 |
| 2 | Clearing audio rebuilds the default chart and deletes a leading blank in that chart | minor | src/core/charts.ts:405 |
| 3 | The chord picker still reads chords from the whole envelope | minor | src/vue/ChordproViewer.vue:868 |

## Mechanisms

1. `commitChartDocument` always calls `replaceChart` → `writeSongScopedMeta`, which trims blank lines around the preamble. A blank line between `{x_chart_default:}` and `{start_of_x_chart:}` disappears. Header comments move after the canonical keys.
2. `setAudioUrl` / `setAudioArt` pass `''`, so `rewriteChartInner` runs and `rest.shift()` drops a leading blank in the default chart. The sibling stays.
3. `chordVocab` still matches chords on `liveSource` (the full file) and keeps the first 12 names. The pane shows only the chart document.

## Checklist

| Item | Status |
|------|--------|
| Logic bugs | finding 1, 2, 3 |
| Race conditions | ok |
| Error handling | ok |
| Schema/migrations | N/A |
| API contracts | ok |
| File references | ok |
| Test coverage | finding 1, 2 |
