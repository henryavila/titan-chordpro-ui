---
verdict: needs_changes
provider: local
mode: local
ref: 74fa6e8..HEAD
pass: sealed
counts: {blocker: 0, critical: 2, major: 1, minor: 1, nit: 0}
---

# versoes-cifra F1 local sealed review

Ref `74fa6e8..HEAD` product files. Sealed local agent, two passes, no git log.

## Findings

### L-001 [critical] Correctness — src/vue/use/useOverlay.ts:269

After an overlay changes which chart opens, later base refreshes rebuild from the official file and show the old default chart. `baseFor` with no `file` splices only `chartSlot`'s applied text into `official`. Bare `forceBase()` restores `{x_chart_default}` on the sibling. Recommendation: pass the on-screen file into every personal `forceBase`, and after the slot watch's `load()` paint again with that same file.

### L-002 [critical] Data integrity — src/vue/ChordproViewer.vue:2422

Clearing an explicit song id during local edit deletes the title-keyed overlay. The identity branch discards memory then calls bare `forceBase` without clearing `wMode`. `touch` runs `commitLocalFrom` and `putOverlay(null)` removes keys. Recommendation: set `wMode` null, or skip `commitLocalFrom`, before that `forceBase`. Identity loss must not call `putOverlay`.

### L-003 [major] Backward compatibility — src/core/storage.ts:65

Song ids that contain `:` or `%` are not migrated, and can be read as another song's chart slot. Operator deferred this collision in `decisions/F1.jsonl`. Do not reopen the key format.

### L-004 [minor] Correctness — src/vue/use/useOverlay.ts:239

A suggestion with no chartId shares a queue group with chart id `default`. Group a missing `chartId` under a sentinel that is not the literal id `default`.
