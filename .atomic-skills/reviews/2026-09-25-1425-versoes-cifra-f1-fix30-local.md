---
verdict: needs_changes
provider: local
mode: local
ref: c79a7c5..HEAD
pass: sealed
counts: {blocker: 0, critical: 1, major: 3, minor: 0, nit: 0}
---

# versoes-cifra F1-fix30 local sealed review

## Findings

### L-001 [critical] Data loss — src/vue/ChordproViewer.vue:845
Accepting a suggestion while a persisted rascunho is held in view `forceBase()`s official origin and wipes the draft.

### L-002 [major] Correctness — src/vue/use/useOverlay.ts:369
`load()` returns null when `checkUpdate` is set, so a kept tune never reaches offset/capo.

### L-003 [major] Incorrect musical state — src/vue/ChordproViewer.vue:338
No-tune preload reads the first `{capo:}` in the envelope, not the opened chart.

### L-004 [major] State consistency — src/vue/ChordproViewer.vue:847
Dirty chart-load still `load()`s the new overlay, so Minha versão and the draft diverge.
