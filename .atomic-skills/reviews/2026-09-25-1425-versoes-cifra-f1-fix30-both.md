---
date: 2026-09-25T14:25:00Z
topic: versoes-cifra-f1-fix30
artifact: c79a7c5..HEAD
skill: review-code
reviewer: gpt-6-astra
provider: codex
provider_version: 0.155.0
same_family_remap: false
final_verdict: needs_changes
counts_final: {blocker: 0, critical: 0, major: 3, minor: 0, nit: 0}
counts_blind: {blocker: 0, critical: 0, major: 3, minor: 0, nit: 0}
framing_delta: {dropped: 0, maintained: 3, emerged: 0}
local_counts: {blocker: 0, critical: 1, major: 3, minor: 0, nit: 0}
mode: both
ref: c79a7c5..HEAD
schema_version: "1.1"
localReceiptPath: .atomic-skills/reviews/2026-09-25-1425-versoes-cifra-f1-fix30-local.md
codexReceiptPath: .atomic-skills/reviews/2026-09-25-1425-versoes-cifra-f1-fix30-codex.md
---

# versoes-cifra F1-fix30 both review

Ref `c79a7c5..HEAD`. Local sealed plus Codex gpt-6-astra informed.

Plan-tree verifier: overlay + overlay-ui + storage-seam, 84 tests, exit 0.

## Open findings (block `done`)

1. Accepting a suggestion wipes an unsaved persisted sibling draft — Codex F-001 / local L-001 (critical). `onBaseChange('official')` → `forceBase()`.
2. Dirty chart switch loads destination overlay without applying its text — Codex F-002 / local L-004. `onChartLoad` skips `forceBase` when dirty but still `load()`s.
3. No-tune capo fallback reads the first `{capo:}` in the envelope — Codex F-003 / local L-003. `preloadTune` / `fileCapo` on whole `hostSource`.
4. `load()` returns null when update dialog is open, so a kept tune never reaches offset/capo — local L-002.

Colon/% overlay-key collision stays deferred (`decisions/F1.jsonl`).

Do not `done`. Cursor is E. Next: spawn F1-fix31 writer for these findings.
