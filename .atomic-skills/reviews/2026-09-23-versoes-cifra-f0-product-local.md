---
date: 2026-09-23T19:29:56-03:00
topic: versoes-cifra-f0-product
artifact: eee2c7f..HEAD
skill: review-code
provider: local
reviewer: sealed-subagent
same_family_remap: false
final_verdict: findings_exist
counts_final: {blocker: 0, critical: 0, major: 0, minor: 2, nit: 0}
---

# Local review — versoes-cifra F0 product diff

Ref `eee2c7f..HEAD`, paths `src` and `tests` only. Sealed subagent. Diff only. No commit messages. No fixes.

verdict: findings_exist
counts: blocker=0 critical=0 major=0 minor=2
passes: 2

| # | Summary | Severity | File:line | Mechanism | Impact | Recommendation |
|---|---------|----------|-----------|-----------|--------|----------------|
| 1 | Sound-key rewrite moves a spacer that sat among the keys onto the lyric | minor | src/core/charts.ts:402 | Sound-key lines are dropped from `rest` before the key block is rebuilt, so a blank that was between `{key}` and `{x_audio_sung}` becomes a leading `rest` line and is joined after `formatKeys`. | The chart gains an empty row above the lyric when a sound key is cleared while another sound key remains. | Keep blanks that already follow the last sound-key line. |
| 2 | A later zero or empty `{transpose}` does not clear an earlier value | minor | src/core/import-chordpro.ts:502 | `storedTransposeSemis` returns `parse().meta.transpose`. `parseRaw` assigns that field only when the number is finite and non-zero. | The chart stays shifted after `{transpose:0}`. | Take the last `{transpose}` directive, including 0. |

Host reproduction of finding 1: `setAudioUrl` on a chart whose blank sits between `{key:C}` and `{x_audio_sung}` yields `{key:C}` then a blank line then the lyric.

Finding 2 is the same input the Codex leg rated major. The host reproduction is in the both receipt.
