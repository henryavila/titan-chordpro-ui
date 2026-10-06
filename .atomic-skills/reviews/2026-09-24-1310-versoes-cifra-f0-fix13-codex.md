---
date: 2026-09-24T13:10:00-0300
topic: versoes-cifra-f0-fix13
artifact: 2f4b69603f9032ff2d6f6871a78d35d5ee045ca8..cfbcd1034cad1b5e08965463fd41a1ff578793ae
skill: review-code
mode: codex
provider: codex
reviewer: gpt-6-astra
provider_version: codex-cli 0.155.0
final_verdict: needs_changes
counts_blind: {blocker: 0, critical: 0, major: 4, minor: 0, nit: 0}
counts_final: {blocker: 0, critical: 0, major: 4, minor: 0, nit: 0}
framing_delta: {dropped: 0, maintained: 4, emerged: 0}
---

# Codex review — versoes-cifra F0 fix13

Ref `2f4b696..cfbcd10`. Model `gpt-6-astra`. Pass 2 maintained all four blind findings. Dropped none. Emerged none.

- F-001 major `src/core/charts.ts:522` — `writeMeta(file, {...readMeta(file), subtitle:'X'})` with header `{title:First}` and chart `{title:Second}` replaces the shared title with `Second`.
- F-002 major `src/core/import-chordpro.ts:442` — `writeMeta(..., {artist:'Local'}, {target:'song'})` on `{artist:Local}` plus `{composer:Bach}` leaves the parsed artist as `Bach`. `{title:''}` does not clear a later `{t:Second}`.
- F-003 major `src/core/charts.ts:604` — an explicit set or clear of `x_chart_default` leaves the selector that sits inside a header tab in force, because that copy is kept and `splitCho` uses the last match.
- F-004 major `src/core/charts.ts:833` — `replaceChart` with `{sot}{end_of_x_chart}{eot}` inside the document terminates the chart early. `chartDocument` then returns only `{sot}`.
