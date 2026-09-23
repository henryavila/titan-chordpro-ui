---
date: 2026-09-23T19:50:00Z
topic: versoes-cifra-f0-fix
artifact: 6ff593c..621dfe8
skill: review-code
mode: both
provider: codex
reviewer: gpt-6-astra
provider_version: codex-cli 0.155.0
same_family_remap: false
final_verdict: needs_changes
counts_final: {blocker: 0, critical: 0, major: 1, minor: 1, nit: 0}
localReceiptPath: .atomic-skills/reviews/2026-09-23-versoes-cifra-f0-fix-local.md
codexReceiptPath: .atomic-skills/reviews/2026-09-23-versoes-cifra-f0-fix-codex.md
codexBlindPath: .atomic-skills/reviews/2026-09-23-versoes-cifra-f0-fix-codex-pass1.md
---

# Both review — versoes-cifra F0 fix

Ref `6ff593c..621dfe8`. Product paths only. Local leg first, then Codex `gpt-6-astra` blind and informed on the same captured diff. The local findings were not shown to Codex. No product files were edited.

Local counts: 0 blocker, 0 critical, 0 major, 3 minor.
Codex informed counts: 0 blocker, 0 critical, 1 major, 1 minor. Dropped: none. Emerged: none.

Codex final findings:

- F-001 major `src/vue/ChordproViewer.vue:2050` — each source-pane keystroke runs `commitChartDocument`, which trims the song header. Typing a trailing space in `{title:Uma }` snaps back to `{title:Uma}`. Clearing `{title:}` removes the line. Reproduced on a mounted source pane.
- F-002 minor `src/core/import-chordpro.ts:500` — `storedTransposeSemis` uses `readMeta`, which requires a colon. `parse` accepts `{transpose 2}`. The viewer then applies 0 semitones.

Local-only minors, not in the Codex list:

- `commitChartDocument` rewrites the song header and drops the blank line before the first chart (`src/core/charts.ts:384`).
- Clearing audio drops a leading blank inside the default chart (`src/core/charts.ts:405`).
- The chord picker still reads names from the whole file (`src/vue/ChordproViewer.vue:868`).

This receipt is `mode: both` and `needs_changes`. The major blocks `done` until an operator disposition (`accept`, `defer`, or `fix`).
