---
date: 2026-09-24T13:50:00-0300
topic: versoes-cifra-f0-fix14
artifact: 070b7c1f145522539516036d4d439bfd8113eaa3..03f4ec5f0d16da285d1be4087179dc6ae43de9bd
skill: review-code
mode: local
provider: local
final_verdict: needs_changes
counts: {blocker: 0, critical: 2, major: 3, minor: 0, nit: 0}
---

# Local review — versoes-cifra F0 fix14

Ref `070b7c1..03f4ec5`. Sealed briefing. No product edits in this pass.

- F-L1 critical `src/core/charts.ts:213` — an unclosed `{sot}` or `{sos}` treats later `{start_of_x_chart}` / `{end_of_x_chart}` as notation, so `listCharts` drops a sibling chart.
- F-L2 critical `src/core/charts.ts:558` — `writeMeta(file, readMeta(file))`, `setAudioUrl`, or a duration reformat writes the default chart's title onto the shared header and deletes the chart copy.
- F-L3 major `src/core/charts.ts:408` — on a one-chart file, a `readMeta` spread deletes `{x_chart_default}` that lives inside a tab.
- F-L4 major `src/core/charts.ts:236` — a later non-slug `{x_chart_default:Oferta}` clears a valid selector.
- F-L5 major `src/core/charts.ts:258` — an outside id that names no chart hides a matching in-tab id.
