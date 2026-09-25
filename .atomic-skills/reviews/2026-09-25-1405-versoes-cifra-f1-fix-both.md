---
date: 2026-09-25T14:05:00Z
topic: versoes-cifra-f1-fix
artifact: 320d92a..HEAD
skill: review-code
reviewer: gpt-6-astra
provider: codex
provider_version: 0.155.0
same_family_remap: false
final_verdict: needs_changes
counts_final: {blocker: 0, critical: 0, major: 3, minor: 0, nit: 0}
counts_blind: {blocker: 0, critical: 0, major: 3, minor: 0, nit: 0}
framing_delta: {dropped: 0, maintained: 3, emerged: 0}
local_counts: {blocker: 0, critical: 0, major: 2, minor: 0, nit: 0}
mode: both
ref: 320d92a..HEAD
schema_version: "1.1"
localReceiptPath: .atomic-skills/reviews/2026-09-25-1405-versoes-cifra-f1-fix-local.md
codexReceiptPath: .atomic-skills/reviews/2026-09-25-1405-versoes-cifra-f1-fix-codex.md
---

# versoes-cifra F1-fix both review

Ref `320d92a..HEAD`. Local sealed plus Codex gpt-6-astra informed. Dual receipts.

Plan-tree verifier: overlay + overlay-ui + storage-seam, 80 tests, exit 0.

## Open findings (must fix before `done`)

1. Unsaved persisted draft lost on chart switch via `onChartLoad` `forceBase` — Codex F-001, `ChordproViewer.vue:832-834`.
2. Sibling-chart accept missing from working file because `onBaseChange` paints `session.getSource()` — Codex F-002, `ChordproViewer.vue:829-830`.
3. Identity loss leaves edit live; Ctrl+S publishes — Codex F-003 + local L-002, `ChordproViewer.vue:2430`.
4. Destination chart without TuneOp keeps previous transpose/capo/dual — local L-001, `applyChartTune` `ChordproViewer.vue:339`.

## Fixes applied in this session

None. Remaining majors go to a sibling F1 fix writer.

Do not `done`.
