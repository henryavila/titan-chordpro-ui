---
date: 2026-09-25T13:40:47Z
topic: versoes-cifra-f1
artifact: 74fa6e8..HEAD
skill: review-code
reviewer: gpt-6-astra
provider: codex
provider_version: 0.155.0
same_family_remap: false
final_verdict: needs_changes
counts_final: {blocker: 0, critical: 0, major: 3, minor: 0, nit: 0}
counts_blind: {blocker: 0, critical: 0, major: 4, minor: 0, nit: 0}
framing_delta: {dropped: 1, maintained: 3, emerged: 0}
local_counts: {blocker: 0, critical: 2, major: 1, minor: 1, nit: 0}
mode: both
ref: 74fa6e8..HEAD
schema_version: "1.1"
localReceiptPath: .atomic-skills/reviews/2026-09-25-1340-versoes-cifra-f1-local.md
codexReceiptPath: .atomic-skills/reviews/2026-09-25-1340-versoes-cifra-f1-codex.md
---

# versoes-cifra F1 both review

Ref `74fa6e8..HEAD` product files (`src` + `tests`). Local sealed pass then Codex CLI 0.155.0 model `gpt-6-astra` (self-report `gpt-6`). Dual receipts: local + informed Codex.

Plan-tree verifier before this review: `CI=true pnpm exec vitest run tests/core/overlay.test.ts tests/vue/overlay-ui.test.ts tests/vue/storage-seam.test.ts` — Test Files 3 passed, Tests 76 passed, exit 0.

## Framing Δ

1 dropped (colon/% overlay-key collision — F1 `defer` in `decisions/F1.jsonl` plus T-001 key contract). 3 maintained. 0 emerged.

## Open findings (must fix before `done`)

1. **Identity loss during local edit deletes the title overlay** — `src/vue/ChordproViewer.vue:2415-2422`. Local: critical L-002. Codex informed: major F-001. `forceBase()` while `wMode` is `local` writes `putOverlay(null)` under the title key.
2. **Revert / bare `forceBase` restores the official default chart** — `src/vue/use/useOverlay.ts:267-270`. Local: critical L-001. Codex informed: major F-002. Rebuild from `official` restores `{x_chart_default}`.
3. **Chart-slot watch discards `TuneOp` from `load()`** — `src/vue/use/useOverlay.ts:371-379`. Codex informed: major F-003. Destination chart text loads; transpose/capo do not.

## Deferred / not blocking this close

- Colon/% overlay-key collision (local L-003, Codex blind F-001). Operator `defer` in `decisions/F1.jsonl`.
- Missing `chartId` sharing the `default` queue group (local L-004, minor).

## Fixes applied in this session

None. Automate host is code-only-forbidden; remaining majors go to a sibling F1 fix writer.

Do not `done`. Open majors remain.
