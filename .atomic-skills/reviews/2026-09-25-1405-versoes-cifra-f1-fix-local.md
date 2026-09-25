---
verdict: needs_changes
provider: local
mode: local
ref: 320d92a..HEAD
pass: sealed
counts: {blocker: 0, critical: 0, major: 2, minor: 0, nit: 0}
---

# versoes-cifra F1-fix local sealed review

## Findings

### L-001 [major] Correctness — src/vue/ChordproViewer.vue:339
`applyChartTune` returns on null. A destination chart without a TuneOp keeps the previous chart's transpose/capo/dual.

### L-002 [major] Write-role — src/vue/ChordproViewer.vue:2430
Identity loss sets `wMode` null but leaves `localMode` as edit. `save()` then publishes. Exit editing (`localMode = 'view'`) and refuse save without persisted write mode plus valid identity.
