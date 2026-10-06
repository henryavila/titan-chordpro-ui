---
verdict: needs_changes
provider: codex
model: gpt-6-astra
mode: both
ref: d05cf9f..HEAD
pass: informed
counts: {blocker: 0, critical: 0, major: 3, minor: 1, nit: 0}
local_counts: {blocker: 0, critical: 1, major: 2, minor: 0}
---

# versoes-cifra F0 fix21 both review

Ref `d05cf9f..HEAD` limited to `src` and `tests`. Patch id `4e78645eac1ac437d708faa39ed4d16ba61b2aa8`. Tip `33f966b`. Codex CLI 0.155.0, model `gpt-6-astra` (self-report `gpt-6`), reasoning high, sandbox read-only. Local leg was a sealed subagent on the same captured diff. Neither leg saw the other.

Raw: `/tmp/versoes-cifra-review/pass1-out.md`, `/tmp/versoes-cifra-review/pass2-out.md`.

## Counts

- Local: 0 blocker, 1 critical, 2 major, 0 minor
- Codex blind: 0 blocker, 0 critical, 3 major
- Codex informed: 0 blocker, 0 critical, 3 major, 1 minor
- Framing Δ: 1 dropped, 2 maintained, 2 emerged

## Local findings

1. **critical** `src/core/charts.ts:517` — `{start_of_x_chart:completa}` / `{sot}` / `{start_of_x_chart:nota}` / `{end_of_x_chart}` / `{start_of_x_chart:oferta}` / `{x_chart_default:oferta}` / `{eot}` lists only `completa`. Reproduced.
2. **major** `src/core/charts.ts:564` — `{eot}` inside `{sos}`…`{eos}` closes the tab in `stepBlock`, so a later `{start_of_x_chart}` splits and `{title:}` after that inner closer is active meta. Reproduced: `readMeta` returns `NOTATION`.
3. **major** `src/core/charts.ts:1076` — one start and one end in reverse order are stripped. Reproduced: `replaceChart` rewrites `oferta`.

## Codex informed findings

1. **major** `src/core/charts.ts:530` — alternating unmatched `{sos}`/`{sot}` rescans suffixes. Reproduced: 36 openers, `listCharts` 4811 ms.
2. **major** `src/core/charts.ts:1074` — same reversed pair as local #3.
3. **major** `src/core/charts.ts:541` — sequential walk closes the tab on `{eot}` inside a finished score, so `{title:NOTATION}` before the real `{eot}` is the chart title. Reproduced.
4. **minor** `src/vue/edit/MetaDialog.vue:203` — `sameDuration('4m26s','04:26')` is true because the mask matches while only one side has seconds. Reproduced.

## Dropped

Codex blind F-002 (`notationCloserAfter` returns -1 on `{end_of_x_chart}`) was dropped. The constraint says that fence delimits the chart and a closer after it does not count. Do not restore the old one-chart read for that input.

## Fix

Code-only writer. Do not `done`.
