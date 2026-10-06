---
date: 2026-09-24T12:20:00-0300
topic: versoes-cifra-f0-fix12
artifact: dddfad9..109f57f22f2c4d9ebc401b3e187f7e2b5973e7b3
skill: review-code
mode: codex
provider: codex
reviewer: gpt-6-astra
provider_version: codex-cli 0.155.0
final_verdict: needs_changes
counts_blind: {blocker: 0, critical: 0, major: 2, minor: 1, nit: 0}
counts_final: {blocker: 0, critical: 0, major: 2, minor: 1, nit: 0}
framing_delta: {dropped: 0, maintained: 3, emerged: 0}
---

# Codex review — versoes-cifra F0 fix12

Ref `dddfad9..109f57f22f2c4d9ebc401b3e187f7e2b5973e7b3`. Model `gpt-6-astra`. Pass 2 maintained all three blind findings. Dropped none. Emerged none.

## Findings

### F-001 [major] Backward compatibility — src/core/import-chordpro.ts:446-448

**Claim:** With header `{title:First}` and default-chart `{title:Second}`, `writeMeta(file, { title: 'Second' })` leaves the shared header unchanged because unconditional `preserveEcho` treats equality with `readMeta` as a copied value.

**Impact:** A sibling inheriting the shared header continues displaying `First` after the requested title update. The same sparse call updated the shared header at the base revision.

**Recommendation:** Enable echo preservation only for callers that copy `readMeta`. A sparse explicit patch must still update the header. Add a regression with a canonical identity override inside the default chart.

**Confidence:** high

### F-002 [major] Data integrity — src/core/charts.ts:315

**Claim:** When a header tab contains `{x_chart_default:oferta}`, an unrelated subtitle save deletes the selector because `readKeyed` skips it while `keepSongHeaderLine` removes it.

**Impact:** With `completa` as the first chart, `writeSongScopedMeta(file, { subtitle: 'X' })` changes the default from `oferta` to `completa`. `x_chart_default` is not an identity credit.

**Recommendation:** Preserve the effective selector across an unrelated save, including when the directive sits inside a header notation block. Add a regression for stable `defaultId`.

**Confidence:** high

### F-003 [minor] Correctness — src/core/charts.ts:639-642

**Claim:** Ordinary text inside tab or score sets `seenBody` because the block guard requires a directive, so a later blank between leading sound keys is kept and lands before the lyric.

**Impact:** `{sot}\ne|-----0-----|\n{eot}\n{key:G}\n\n{tempo:72}\n[G]linha` plus clearing audio yields a blank before `[G]linha`.

**Recommendation:** Skip body detection for every line inside an active notation block. Test a tab row that is not a directive.

**Confidence:** high

## Pass 2 reconciliation

- Dropped: none
- Maintained: F-001, F-002, F-003, same severity
- Emerged: none
