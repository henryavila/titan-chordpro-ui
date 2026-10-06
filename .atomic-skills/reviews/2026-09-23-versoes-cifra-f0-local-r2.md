---
date: 2026-09-23T14:30:00Z
topic: versoes-cifra-f0
artifact: 742f839..fa9d400
skill: review-code
reviewer: local-explore
provider: local
mode: local
final_verdict: findings_exist
counts_final: {blocker: 1, critical: 1, major: 1, minor: 0, nit: 0}
---

# Local review — versoes-cifra F0

Ref `742f839..fa9d400`, product paths `src/` and `tests/` only. Sealed briefing. No fixes applied in this pass.

verdict: findings_exist
total_findings: 3
counts: blocker=1 critical=1 major=1 minor=0
passes: 3

| # | Summary | Severity | File:line | Mechanism | Impact | Recommendation |
|---|---------|----------|-----------|-----------|--------|----------------|
| 1 | Block edits splice chart-document line indexes into the full file | blocker | src/core/parse.ts:308 | `parse` sets `view.source` and every `li0`/`li1` from `chartDocument`, which drops the preamble, the other envelopes, and `{x_chart_label}`. `ChordproViewer` still lays out that view (`ChordproViewer.vue:387`, `:822`) and `useBlockEdit` splits and splices the unsliced file at those indexes (`useBlockEdit.ts:93`, `:659`). On `TWO_CHART_SOURCE` the oferta lyric is document line 4, which is `{start_of_x_chart:completa}` in the file. | Editing the visible default-chart line rewrites a header or sibling-chart line and leaves the line on screen unchanged. One edit can delete the other chart’s envelope. Source-pane selection (`SourcePane.vue:74`) highlights the same wrong lines. | Number `li0`/`li1` in full-file coordinates (`FileChart.startLi` plus the inner offset), or edit `view.source` and write it back only through `replaceChart`. |
| 2 | Untargeted `writeMeta` stamps file-global `readMeta` onto the default chart and cannot clear a key | critical | src/core/import-chordpro.ts:436 | For an envelope, two-arg `writeMeta` treats every defined `ChartMeta` field as a patch (`songPatchOf` / `soundPatchOf`) and `applyPatch` (`charts.ts:295`) only changes keys present on that object. `readMeta` (`charts.ts:138`) is still last-wins across the whole file. `writeStrumPatterns` (`import-chordpro.ts:397`), `setAudioUrl` (`audio-url.ts:65`), `createSourceSession.setMeta` (`source-session.ts:64`), and `MetaDialog.apply` (`MetaDialog.vue:173`) all pass `{...readMeta(source)}` with deletions done by `delete`, not by `''`. | Saving metadata, audio, or batida on an N>1 file writes the later chart’s `key` / `duration` / `tempo` / audio onto the default chart. Clearing `{x_strum}` or `{x_audio_sung}` does not remove them. Opening Meta and applying without edits is enough. | Make two-arg `writeMeta` chart-scoped: read and write the default chart’s own sound bag, and keep flat-file replace semantics so a missing key still deletes. Thread `chartId` from the open chart. |
| 3 | Sound directives above the first envelope are invisible, and `.cho` export puts `{capo:}` there | major | src/core/charts.ts:230 | `songIdentityHeader` keeps only song-identity directives. `key`, `capo`, `tempo`, `time`, `duration`, and `transpose` in the preamble are not copied into the chart body. `exportCho` (`export-cho.ts:20`) deletes every `{capo:}` and prepends `{capo: N}` when capo is non-zero. `parse` then slices that string (`parse.ts:308`). PDF uses `view.meta.capo` (`render-pdf.ts:273`). | Exporting an enveloped chart with capo on, then reopening or generating PDF, yields capo 0 even though `{capo:}` is in the file. A preamble `{key:}` / `{duration:}` is likewise ignored for the chart on screen. | When building the chart document, carry preamble sound keys into that chart (or stop `exportCho` from hoisting `{capo:}` out of the envelope). |

## Triage (orchestrator, not a disposition token)

- Finding 1: Vue / `useBlockEdit` indexes. Not an F0 admitted edit. Not fixed here.
- Finding 2: in scope. Writer `impl/versoes-cifra-F0-fix4` is limited to `readMeta` matching the default chart document, inside admitted paths. `audio-url.ts` and `source-session.ts` stay untouched.
- Finding 3: `exportCho` / preamble sound. Not this dispatch.

This file is the local leg only. It is not a `mode: both` close receipt.
