# Evaluation report — versoes-cifra F1

planSlug: versoes-cifra
phaseId: F1
head: 01904a2
productCommit: 9c40673

## verdict

pass

## findings

(none)

## businessIntentCheck

- value: pass. Overlay, tune and suggestion are keyed to the chart on screen, not the whole file. `overlayKey(songId, chartId)` is `cpv:my:{songId}:{chartId}`; omitted/`default` share `cpv:my:{songId}:default` (`src/core/storage.ts`). `useOverlay` reads `ovKey` from `chartSlot` (`activeChartId` of the official file) and diffs/applies ops on `chartText` = `parse(file, { chartId }).source`. A two-chart file stores Minha versão on `cpv:my:uma:oferta`, not the implicit default slot (`tests/vue/storage-seam.test.ts`). Created Suggestion stamps `chartId` of the active chart; `TextOp.at` is the line in that chart document, not the concatenated file (`tests/vue/overlay-ui.test.ts` “stamps the active chart…”). Accept splices via `replaceChart` (`fileWithChart`) and `save-content` is the whole file with sibling blocks. The unsuffixed `cpv:my:{songId}` still loads as the default chart of a plain file; the next write uses `:default`.
- workflow: pass. `overlayKey("jesus-1", "oferta")` is `cpv:my:jesus-1:oferta`; `overlayKey("jesus-1")` equals `overlayKey("jesus-1", "default")` (`tests/core/overlay.test.ts`). A stored `cpv:my:jesus-1` overlay loads on a one-chart file, TuneOp still lands on that overlay, and the next write is `cpv:my:jesus-1:default` while the legacy key is retired (`tests/vue/storage-seam.test.ts`). Envelope files do not adopt that legacy key — not even a block whose id is the string `default`. `suggest()` sets `chartId: chartSlot` unless `plainFile`; `acceptOp` applies on `chartText` of `sugChartId`, then `publishChart(full, id)` which calls `onSaveContent` with the spliced file. Queue grouping is `songId` plus chartId (`queueGroupKey`); reviewer labels are `title · chart label`. Observed on HEAD: `pnpm exec vitest run tests/core/overlay.test.ts tests/vue/overlay-ui.test.ts tests/vue/storage-seam.test.ts` exit 0, 92 tests.
- rules: pass. F1 overlay/suggestion contract does not depend on the title chip or editor CRUD. Setlist still uniquifies duplicate song ids with `~` so two list rows do not share an overlay (`src/vue/use/useSetlist.ts`); it is not uniquify-by-chart. `save-content` on accept is the full file (`{start_of_x_chart:completa}` and `{start_of_x_chart:oferta}` both present; sibling body unchanged). The package does not POST a suggestion: `persistSuggestion` is an optional host Promise; void/reject keeps Minha versão (`tests/vue/overlay-ui.test.ts` host persistSuggestion ack). Identity inside tab/score stays notation — overlay ops are still ChordPro line anchors on the chart document. A suggestion whose `chartId` is missing from the file, or whose `songId` is not the open file, does not splice (`does not accept a suggestion whose chart id is not in the file` / `whose song is not the open file`).
- outOfScope: pass. Title chip, `addChart` / `renameChart` / `deleteChart`, export, and VISAO/SPEC/NAMING rewrite are F2–F4. Those product surfaces exist on this branch because the operator asked to implement the rest of the plan before F1 close. Extra scope is not an F1 failure. F1 is judged only on overlay/suggestion: key per chart, legacy default mapping, `Suggestion.chartId`, `TextOp.at` on the chart document, `replaceChart` accept, full-file `save-content`.
- doneWhen: pass. `tests/core/overlay.test.ts`, `tests/vue/storage-seam.test.ts`, and `tests/vue/overlay-ui.test.ts` are green on HEAD (F1-G1, exit 0, 92 tests). Key is per chart; accept/save returns the whole file with siblings. Initiative tasks T-001 and T-002 are `done` with `evidence.passed: true` at `3c2be3c` (T-001: 40 tests exit 0; T-002: 52 tests exit 0). HEAD `01904a2` is state-only (phase YAML, claims, analytics). Product files are unchanged from `9c40673`. YAML exit-gate stamp F1-G1 stays `pending`. That stamp is not a product failure. Colon/% overlay-key encoding is covered by tests (`overlayKey('song:default')` is not `cpv:my:song:default`; `overlayKey('a:b')` is not `overlayKey('a%3Ab')`); remaining id-collision residual is deferred in `decisions/F1.jsonl` and does not break the F1 contract for ids without `:` or `%`.

## exitGates

- F1-G1: pass. Overlay/suggestion chart-id tests green on HEAD: `pnpm exec vitest run tests/core/overlay.test.ts tests/vue/overlay-ui.test.ts tests/vue/storage-seam.test.ts`, exit 0, 92 tests. Ops at-line from oferta do not apply into completa (`titleOp.at` matches `parse(..., { chartId: "oferta" }).source`, not the file index; accept of oferta leaves completa title and `[G]corpo da completa`). Legacy overlay key is not dropped without mapping to default (plain file reads `cpv:my:jesus-1`, next write `cpv:my:jesus-1:default`). `Suggestion` carries `chartId`. accept/`save-content` emits the whole file with sibling charts, not only the visible chart.
