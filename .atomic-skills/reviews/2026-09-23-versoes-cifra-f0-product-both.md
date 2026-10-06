---
date: 2026-09-23T19:29:56-03:00
topic: versoes-cifra-f0-product
artifact: eee2c7f..63793b2
skill: review-code
mode: both
provider: codex
reviewer: gpt-6-astra
provider_version: codex-cli 0.155.0
same_family_remap: false
final_verdict: needs_changes
counts_blind: {blocker: 0, critical: 0, major: 2, minor: 0, nit: 0}
counts_final: {blocker: 0, critical: 0, major: 2, minor: 0, nit: 0}
framing_delta: {dropped: 0, maintained: 2, emerged: 0}
localReceiptPath: .atomic-skills/reviews/2026-09-23-versoes-cifra-f0-product-local.md
codexReceiptPath: .atomic-skills/reviews/2026-09-23-1929-versoes-cifra-f0-product-codex.md
codexBlindPath: .atomic-skills/reviews/2026-09-23-1929-versoes-cifra-f0-product-codex.md
---

# Both review — versoes-cifra F0 product diff

Ref `eee2c7f..HEAD` (`63793b2`). Product paths `src` and `tests` only. Local sealed pass first, then Codex `gpt-6-astra` blind and informed on the same captured diff (`sha256 19981269d4b28e4e6ef384756bdb1cbbe28dbb51391b8f6eec20a3b5c55df652`). The local findings were not shown to Codex. No product files were edited.

Local counts: 0 blocker, 0 critical, 0 major, 2 minor.
Codex informed counts: 0 blocker, 0 critical, 2 major, 0 minor. Dropped: none. Emerged: none.

Codex final findings, both reproduced in this worktree:

- F-001 major `src/core/import-chordpro.ts:501` — `storedTransposeSemis('{key:C}\n{transpose:2}\n{transpose:0}\n[C]uma')` returns `2`. `readMeta` of the same text has `transpose` `"0"`. `parse` stores transpose only when the number is finite and not zero (`src/core/parse.ts:160`).
- F-002 major `src/core/charts.ts:460` — `commitChartDocument` copies `{title Uma}` and `{composer:Alguém}` raw. `readMeta` of the result has `title` and `artist` undefined. `readMetaLines` requires a colon (`src/core/charts.ts:144`). `canonicalMetaKey` does not map `composer` (`src/core/charts.ts:81`).

Local-only minor, not in the Codex list:

- Clearing a sound key moves a blank that sat between the remaining sound keys onto the lyric (`src/core/charts.ts:402`). Reproduced with `setAudioUrl(null)` when a blank sits between `{key:C}` and `{x_audio_sung}`.

The local transpose minor is the same input as Codex F-001. Codex kept it major on the informed pass.

This receipt is `mode: both` and `needs_changes`. The majors block `done` until an operator disposition (`accept`, `defer`, or `fix`).

## Self-review against code-quality gates

- G1 read-before-claim: no product edit. Reproductions were run against the current tree.
- G2 soft-language: no fix descriptions.
- G3 anti-tautology: N/A. No new test.
- G4 fixture realism: N/A. No new fixture.
- G7 anti-premature-abstraction: N/A. No new helper.
