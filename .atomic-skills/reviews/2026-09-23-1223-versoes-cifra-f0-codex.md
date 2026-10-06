---
date: 2026-09-23T12:23:38Z
topic: versoes-cifra-f0
artifact: 742f83979b3e9ae1e442b459c1cf9fb998e9672e..6c5fc66
skill: review-code
reviewer: gpt-6-astra
provider: codex
provider_version: codex-cli 0.155.0
same_family_remap: false
final_verdict: needs_changes
counts_final: {blocker: 0, critical: 1, major: 2, minor: 0, nit: 0}
counts_blind: {blocker: 0, critical: 1, major: 2, minor: 0, nit: 0}
framing_delta: 0d/3=/0+
schema_version: "1.1"
---

# Cross-Model Review — versoes-cifra-f0

Provider Codex, model `gpt-6-astra`. Ref `742f839..6c5fc66`. Pass 1 and pass 2 both `needs_changes`. Nothing dropped, nothing new.

## Pass 2 (informed)

### F-001 [critical] Data integrity — src/core/import-chordpro.ts:422-426

**Claim:** Existing callers still use two-argument `writeMeta` for chart updates, so the song-only dispatch silently discards metadata required by their operations.

**Impact:** `rewriteToKey` on an enveloped file changes chords in every chart, keeps the old `{key:}` lines, writes no `{transpose:}`, and reports `changed: true`. `setAudioUrl`, `writeStrumPatterns`, and `SourceSession.setMeta` use the same two-argument path.

**Recommendation:** Point those callers at one chart and splice it back, or reject an enveloped file before rewriting chords. Add tests.

**Confidence:** high

### F-002 [major] Data integrity — src/core/charts.ts:419-425

**Claim:** `replaceChart` does not persist deletion of song identity fields that are absent from the replacement document.

**Impact:** Clearing `artist` on the chart document and splicing it back restores the old artist.

**Recommendation:** When the document is the full projected chart, clear missing song-identity fields. Keep `x_chart_default`.

**Confidence:** high

### F-003 [major] Correctness — src/core/charts.ts:278-285

**Claim:** `readKeyed` keeps the first value. `readMeta` lets a later exact key override an alias.

**Impact:** `{x_audio:old}` before `{x_audio_sung:current}` reads as current, then a duration-only chart write stores `old`. `{key:C}` then `{key:D}` parses as D and becomes C after an unrelated duration edit.

**Recommendation:** Use the same precedence as `readMeta`. Add a regression test.

**Confidence:** high

## Reconciliation

- Dropped: none
- Maintained: F-001 critical, F-002 major, F-003 major
- Emerged: none
