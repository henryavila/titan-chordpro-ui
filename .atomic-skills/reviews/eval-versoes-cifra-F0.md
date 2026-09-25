# Evaluation report — versoes-cifra F0

planSlug: versoes-cifra
phaseId: F0
head: c84fdc9
productCommit: 53d8a8e

## verdict

pass

## findings

(none)

## businessIntentCheck

- value: pass. `parse` slices with `chartDocument` before `parseRaw` (`src/core/parse.ts`). On `TWO_CHART_SOURCE`, `parse` with no `chartId` returns the default chart only: key `C`, duration `02:00`, lyrics contain `corpo da oferta` and do not contain `corpo da completa` (`tests/core/charts-envelope.test.ts`). `view.source` for `chartId: "oferta"` contains that chart and does not contain the sibling body or `{end_of_x_chart}`. After `writeMeta` sets `x_chart_default` to `completa`, `parse` of `completa` has key `G` and `parse` of `oferta` has key `C`. After a chart-target rewrite of oferta to duration `03:00`, `parse` of `completa` keeps duration `04:26`. Bodies are not concatenated and key/duration are not last-write across charts.
- workflow: pass. `listCharts`, `parse` with `chartId`, `writeMeta` with `target: "song"` and `target: "chart"`, and `replaceChart` are exported from core and covered by `tests/core/charts-envelope.test.ts`. Observed on HEAD: `pnpm exec vitest run tests/core/charts-envelope.test.ts` exit 0, 104 tests. `listCharts` with no envelope returns one entry `id: "default"`. Two `{start_of_x_chart}` blocks list `completa`, `oferta` in file order. `x_chart_default` sets `isDefault`; `x_chart_label` supplies the label. Song-target `writeMeta` leaves both chart keys and both durations. Chart-target `writeMeta` changes only the named chart. `replaceChart` substitutes one chart document and keeps the sibling. Two-arg `writeMeta` on N>1 puts the sound key on the default chart, not a preamble header.
- rules: pass. No envelope is one implicit chart `default` (`splitCho` in `src/core/charts.ts`; listCharts test; one-chart `writeMeta` still rewrites a single header). A one-chart jesus-style fixture still parses with the same title and 11 sections with and without `chartId: "default"`. `src/core` has no Vue import (`tests/core/no-vue-in-core.test.ts`). `fixtures/sda` has no `start_of_x_chart`. `src/core/parse.ts` has no `{new_song}`. `src/core/charts.ts` states `{new_song}` is not used. `src/vue/ChordproViewer.vue` pins the chart the edit session opened and calls `parse` / `commitChartDocument` with that id. There is no chart-switcher control. That pin is not a Vue import in core and not a UI writer of N>1 charts.
- outOfScope: pass. No title chip. No `addChart` / `renameChart` / `deleteChart`. `overlayKey` remains `cpv:my:` plus `songId` (`src/core/storage.ts`). `Suggestion` has `songId` and no `chartId` (`src/core/overlay.ts`). `exportCho` options are key, semitones, and capo (`src/core/export-cho.ts`). `docs/` has no `start_of_x_chart` / `listCharts` text, including `docs/VISAO.md`.
- doneWhen: pass. `tests/core/charts-envelope.test.ts` is green on HEAD (exit 0, 104 tests). `tests/demo/sda-fixtures.test.ts` and `tests/core/no-vue-in-core.test.ts` were in the seven-file suite that exited 0 with 249 tests before the state-only close commit `c84fdc9`. That commit changes initiative YAML, plan `lastUpdated`, automate status, and analytics only. Product files are unchanged from `53d8a8e`. Both review `.atomic-skills/reviews/2026-09-24-fix28-both.md` is approve with zero findings on `a4cc4f2..HEAD` for `src/core/charts.ts` and `tests/core/charts-envelope.test.ts`. Initiative tasks T-001, T-002, and T-003 are `done`. YAML exit-gate stamps stay `pending`. That stamp is not a product failure.

## exitGates

- F0-G1: pass. Envelope tests green on HEAD: `pnpm exec vitest run tests/core/charts-envelope.test.ts`, exit 0, 104 tests. Two-chart parse does not concatenate bodies and does not last-write key or duration across charts (see value).
- F0-G2: pass. `tests/core/no-vue-in-core.test.ts` and `tests/demo/sda-fixtures.test.ts` passed inside the seven-file suite (exit 0, 249 tests) on the product tree that HEAD still has. `src/core` has no `from "vue"` import. `fixtures/sda` has no envelope marker. SDA fixtures stay one chart per file.
