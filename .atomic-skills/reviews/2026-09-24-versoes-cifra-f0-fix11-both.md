---
date: 2026-09-24T08:40:20-0300
topic: versoes-cifra-f0-fix11
artifact: 3b1f9ef..dddfad9
skill: review-code
mode: both
provider: codex
reviewer: gpt-6-astra
provider_version: codex-cli 0.155.0
final_verdict: needs_changes
counts_blind: {blocker: 0, critical: 0, major: 2, minor: 0, nit: 0}
counts_final: {blocker: 0, critical: 0, major: 3, minor: 0, nit: 0}
framing_delta: {dropped: 0, maintained: 2, emerged: 1}
localReceiptPath: .atomic-skills/reviews/2026-09-24-versoes-cifra-f0-fix11-local.md
codexReceiptPath: .atomic-skills/reviews/2026-09-24-0840-versoes-cifra-f0-fix11-codex.md
---

# Both review — versoes-cifra F0 fix11

Ref `3b1f9ef..dddfad9`. Same captured diff. No product edits between the passes.

Local: 0 blocker, 0 critical, 2 major, 1 minor.
Codex informed: 0 blocker, 0 critical, 3 major. Dropped none. Emerged 1.

Host reproduced F-001: `writeSongScopedMeta('{artist:Local}\n{composer:Bach}\n[C]song\n', { artist: 'Local' })` still parses as Bach. `writeSongScopedMeta('{title:}\n{t:Second}\n[C]song\n', { title: '' })` still parses as Second.

- F-001 major `src/core/charts.ts:450` — an explicit identity value that equals `readMeta` is ignored when `parse` shows a later alias.
- F-002 major `src/core/charts.ts:480` — an unrelated subtitle save can drop a shared `{composer:}` and change a sibling chart's displayed artist.
- F-003 major `src/core/charts.ts:354` — an unrelated save deletes a credit line that sits inside tab or score when the outer credit already matches `readMeta`.

Local-only major: a new artist or title is ignored when the alias `parse` shows sits inside the default chart body. Local minor: an `{image:}` inside tab marks the body started.

`needs_changes`. Do not `done`.
