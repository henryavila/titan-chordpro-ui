---
date: 2026-09-24T12:20:00-0300
topic: versoes-cifra-f0-fix12
artifact: dddfad9..109f57f22f2c4d9ebc401b3e187f7e2b5973e7b3
skill: review-code
mode: both
provider: codex
reviewer: gpt-6-astra
provider_version: codex-cli 0.155.0
final_verdict: needs_changes
counts_local: {blocker: 0, critical: 1, major: 2, minor: 0, nit: 0}
counts_final: {blocker: 0, critical: 0, major: 2, minor: 1, nit: 0}
framing_delta: {dropped: 0, maintained: 3, emerged: 0}
localReceiptPath: .atomic-skills/reviews/2026-09-24-versoes-cifra-f0-fix12-local.md
codexReceiptPath: .atomic-skills/reviews/2026-09-24-1220-versoes-cifra-f0-fix12-codex.md
---

# Both review — versoes-cifra F0 fix12

Ref `dddfad9..109f57f22f2c4d9ebc401b3e187f7e2b5973e7b3`. Same captured diff. No product edits between the passes.

Local: 0 blocker, 1 critical, 2 major, 0 minor.
Codex informed (`gpt-6-astra`): 0 blocker, 0 critical, 2 major, 1 minor. Dropped none. Emerged none.

`needs_changes`. Do not `done`.

- F-L1 critical `src/core/charts.ts:776` — saving a chart document deletes identity directives inside a chart-body tab or score and can hoist them into the song header.
- F-L2 major `src/core/charts.ts:640` — a non-directive line inside tab or score still counts as the lyric body, so a blank between leading sound keys lands on the lyric. Same mechanism as Codex F-003.
- F-L3 major `src/core/import-chordpro.ts:439` — `writeMeta(..., { target: 'song' })` treats a `readMeta` echo as an explicit identity edit and drops the alias `parse` shows.
- F-001 major `src/core/import-chordpro.ts:446` — two-arg `writeMeta(file, { title: 'Second' })` leaves header `{title:First}` unchanged when the default chart already contains `{title:Second}`, because unconditional `preserveEcho` treats that as a copy.
- F-002 major `src/core/charts.ts:315` — `{x_chart_default:oferta}` inside a header tab is deleted by an unrelated subtitle save, so the default chart changes.

## Self-review against code-quality gates

- G1 read-before-claim: N/A for edits — this pass recorded findings only. Cited lines were read in `src/core/charts.ts` and `src/core/import-chordpro.ts` before the fix dispatch.
- G2 soft-language: scanned this file; 0 ban-list occurrences in the finding lines.
- G3 anti-tautology: N/A — no new test in this pass.
- G4 fixture realism: N/A — no new fixture in this pass.
- G7 anti-premature-abstraction: N/A — no new helper in this pass.
