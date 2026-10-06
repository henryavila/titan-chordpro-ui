# Cifras nomeadas da mesma música — `titan-chordpro-ui`

Uma música tem várias cifras (oferta, completa, simplificada, louvor). Este plano coloca N cifras nomeadas no mesmo `.cho`, fatiia o parse, troca no viewer/editor, e recorta overlay/sugestão por cifra. SoT: `projects/titan-chordpro-ui/versoes-cifra/design.md`. verified_by: design.md Decisions 1–15.

## Princípios

- **P1 Reader before writer** — Parse, listCharts, seletor e overlay keyed existem e estão verdes antes de qualquer writer gravar envelope N>1. verified_by: design.md Decision 14, Blast radius.
- **P2 Um arquivo = uma música** — `songId` e o item da setlist não mudam ao trocar cifra. `{new_song}` é proibido. verified_by: design.md Decisions 1–2, Rejected alternatives.
- **P3 Identidade tripla** — `songId` (música), `chartId` (cifra), overlay `cpv:my:{songId}:{chartId}`. Ops de sugestão no documento da cifra, não no arquivo concatenado. verified_by: design.md Decisions 3, 8.
- **P4 Setlist não é switcher de cifra** — Swipe de borda, dock e `songs[]` continuam N músicas. Cifra troca no chip do título. verified_by: design.md Decision 6; `src/vue/use/useSetlist.ts`.
- **P5 Core sem Vue** — Envelope, listCharts, parse fatiado, replaceChart, writeMeta target vivem em `src/core`. Chip e editor em Vue. verified_by: `tests/core/no-vue-in-core.test.ts`.
- **P6 Fixtures SDA intactas** — `fixtures/sda` permanece 1 cifra por arquivo. Envelope N>1 usa string mínima no teste, não cifra SDA inventada. verified_by: AGENTS.md; design.md Decision 14.

## Glossário

| Termo | Significado |
|---|---|
| **música** | Unidade de catálogo / setlist / `songId`. Um `.cho`. |
| **cifra** | Arranjo nomeado dentro do arquivo (`chartId` + rótulo). Não se chama versão. |
| **documento da cifra** | ChordPro de uma cifra: header da música + meta sonora + corpo, sem irmãs. Alvo de overlay e edição. |
| **envelope** | `{start_of_x_chart: id}` … `{end_of_x_chart}`. Ausente = cifra implícita `default`. |
| **Minha versão** | Overlay pessoal. Continua overlay, não é uma cifra oficial. |

## F0 — Leitor: envelope e parse fatiado

Goal: `listCharts` e `parse(source, { chartId })` fatiam o arquivo; 1 cifra implícita é bit-compatível com o parse atual; N>1 não concatena corpos; writeMeta tem alvo song/chart; replaceChart reconstitui o arquivo. Sem Vue. Sem writer de UI.

```yaml
exit_gate:
  - id: F0-G1
    description: Envelope tests green. FAILS when parse of a two-chart source concatenates both bodies or last-write-wins key/duration across charts.
    verifier: { kind: shell, command: "pnpm exec vitest run tests/core/charts-envelope.test.ts", expectExitCode: 0 }
  - id: F0-G2
    description: Existing one-chart parse still green on SDA fixtures and no Vue in core.
    verifier: { kind: shell, command: "pnpm exec vitest run tests/core/no-vue-in-core.test.ts tests/demo/sda-fixtures.test.ts", expectExitCode: 0 }
```

### T-001 listCharts and implicit default

- Files: src/core/charts.ts, src/core/index.ts, tests/core/charts-envelope.test.ts
- scopeBoundary: Do not change Vue; do not write N-chart files into fixtures/sda; do not implement overlay keys; do not add the title chip.
- acceptance: listCharts on a source with no start_of_x_chart returns one entry id default; listCharts on a source with two start_of_x_chart blocks returns those two ids in file order; x_chart_default marks isDefault; x_chart_label supplies label else the id; functions export from src/core/index.ts
- verifier: { kind: shell, command: "pnpm exec vitest run tests/core/charts-envelope.test.ts", expectExitCode: 0 }
- RED→GREEN: Failing listCharts tests on a two-block string constant; add charts.ts.

### T-002 parse fatiado does not concatenate

- Files: src/core/parse.ts, src/core/charts.ts, tests/core/charts-envelope.test.ts
- scopeBoundary: Do not drop soc/eoc/tab/score behaviour; do not invent SDA lyrics; do not migrate overlay storage.
- acceptance: parse(twoChartSource) without opts uses the default chart only; parse(twoChartSource, { chartId: "oferta" }) meta.key and duration are the oferta block values; sections contain oferta lyrics and not completa lyrics; view.source is the chart document (song title/artist plus that chart) with no sibling body; a one-chart jesus-style string still parses with the same title and section count as today
- verifier: { kind: shell, command: "pnpm exec vitest run tests/core/charts-envelope.test.ts", expectExitCode: 0 }
- RED→GREEN: Test that today's parse concatenates two bodies; split in parse via listCharts.

### T-003 writeMeta target and replaceChart

- Files: src/core/import-chordpro.ts, src/core/charts.ts, tests/core/charts-envelope.test.ts
- scopeBoundary: Do not change Vue; do not add META_KEYS that collide with start_of_x_chart; do not rewrite fixtures/sda.
- acceptance: writeMeta(file, { title: "X" }, { target: "song" }) changes the song header and leaves both chart keys intact; writeMeta(file, { key: "G", duration: "03:00" }, { target: "chart", chartId: "oferta" }) changes only oferta; replaceChart(file, "oferta", chartDocument) substitutes that chart document and keeps the sibling; one-chart writeMeta without target still matches current header rewrite
- verifier: { kind: shell, command: "pnpm exec vitest run tests/core/charts-envelope.test.ts", expectExitCode: 0 }
- RED→GREEN: Failing target/replace tests against current writeMeta last-one-header; add target and replaceChart.

## F1 — Overlay e sugestão por cifra

Goal: overlay key is cpv:my:{songId}:{chartId}; legacy cpv:my:{songId} reads as chart default; Suggestion carries chartId; TextOp.at is against the chart document; accept splices via replaceChart and save-content emits the whole file.

```yaml
exit_gate:
  - id: F1-G1
    description: Overlay/suggestion chart-id tests green. FAILS when ops at-line from oferta apply into completa or legacy overlay key is dropped without mapping to default.
    verifier: { kind: shell, command: "pnpm exec vitest run tests/core/overlay.test.ts tests/vue/overlay-ui.test.ts", expectExitCode: 0 }
```

### T-001 overlayKey and legacy migrate

- Files: src/core/storage.ts, src/vue/use/useOverlay.ts, tests/core/overlay.test.ts, tests/vue/storage-seam.test.ts
- scopeBoundary: Do not build the title chip; do not add chart CRUD in the editor; do not change setlist id uniquify.
- acceptance: overlayKey("jesus-1", "oferta") is cpv:my:jesus-1:oferta; overlayKey("jesus-1") and overlayKey("jesus-1", "default") share the default slot; a stored cpv:my:jesus-1 value loads for chart default and the next write uses cpv:my:jesus-1:default; TuneOp still stores on that overlay
- verifier: { kind: shell, command: "pnpm exec vitest run tests/core/overlay.test.ts tests/vue/storage-seam.test.ts", expectExitCode: 0 }
- RED→GREEN: Tests fail on current overlayKey(songId) only; extend key and read-legacy path.

### T-002 Suggestion.chartId and accept splice

- Files: src/core/overlay.ts, src/vue/use/useOverlay.ts, src/vue/public.ts, tests/vue/overlay-ui.test.ts
- scopeBoundary: Do not POST to a host; do not change persistSuggestion ack contract; do not emit save-content of only the visible chart.
- acceptance: created Suggestion includes chartId of the active chart; diffOps runs on the chart document from parse; acceptOp calls replaceChart then save-content with the full file string containing siblings; queue grouping key is songId plus chartId so the reviewer label is title plus chart label
- verifier: { kind: shell, command: "pnpm exec vitest run tests/vue/overlay-ui.test.ts", expectExitCode: 0 }
- RED→GREEN: Failing suggestion payload/accept tests with two-chart official text; thread chartId and replaceChart through acceptOp.

## F2 — Viewer: seletor de cifra

Goal: With N>1, a compact control on the title shows the active chart label and switches chartId without goSong; N=1 hides it; swipe/dock/setlist still change songs; live capo/offset/scroll persist per (songId, chartId); timeline and rehearsal audio reload from the new chart document.

```yaml
exit_gate:
  - id: F2-G1
    description: Chart switcher tests green. FAILS when switching chart calls setlist go, or when N=1 still shows the chip, or when swipe on the rail changes chartId.
    verifier: { kind: shell, command: "pnpm exec vitest run tests/vue/chart-switcher.test.ts tests/vue/setlist.test.ts tests/vue/song-swipe.test.ts", expectExitCode: 0 }
```

### T-001 Title chip and chartId prop

- Files: src/vue/public.ts, src/vue/ChordproViewer.vue, src/vue/chrome/CpvViewHead.vue, tests/vue/chart-switcher.test.ts
- scopeBoundary: Do not reuse SetlistSheet or CpvEndOffer; do not add editor add-chart; do not change swipe rail widths.
- acceptance: two-chart source shows a control next to the title with the active x_chart_label; choosing the other chart emits update:chartId and re-parses that chart only; prop chartId selects the initial chart; one-chart source has no chart control in the DOM
- verifier: { kind: shell, command: "pnpm exec vitest run tests/vue/chart-switcher.test.ts", expectExitCode: 0 }
- RED→GREEN: Mount viewer with two-block source; chip missing; add head control wired to parse chartId.

### T-002 Switch is not a song change

- Files: src/vue/ChordproViewer.vue, src/vue/use/useSetlist.ts, tests/vue/chart-switcher.test.ts, tests/vue/setlist.test.ts
- scopeBoundary: Do not alter SWIPE_RAIL_PX; do not reset lens or hideComments on chart switch; do not migrate host loadSong.
- acceptance: chart switch does not call setlist go and does not change songId; overlay of the sibling chart remains in storage; live transpose/capo/scroll restore per chartId; setlist next song still uses goSong and still resets as today
- verifier: { kind: shell, command: "pnpm exec vitest run tests/vue/chart-switcher.test.ts tests/vue/setlist.test.ts", expectExitCode: 0 }
- RED→GREEN: Test that syncHostSource currently resets overlay on any source rewrite; branch chart switch off the song path.

### T-003 Timeline and audio follow the chart

- Files: src/vue/ChordproViewer.vue, tests/vue/chart-switcher.test.ts, tests/vue/audio-ref.test.ts
- scopeBoundary: Do not add synced audio; do not change {duration:} math for one-chart files; do not prefetch setlist audio.
- acceptance: switching to a chart with duration 03:00 rebuilds the timeline from that chart document; x_audio_* of the new chart (or inherited song-level audio when the chart omits tracks) is what the reference player reads; the previous chart playhead does not continue
- verifier: { kind: shell, command: "pnpm exec vitest run tests/vue/chart-switcher.test.ts tests/vue/audio-ref.test.ts", expectExitCode: 0 }
- RED→GREEN: Fail on leftover duration/audio after switch; rebuild timeline and audio from parse of the active chart.

## F3 — Editor: escrever cifras

Goal: Edit session works on the chart document; save-content and update:source emit the full file; add/rename/delete/default exist; deleting the last named chart writes a one-chart file with no envelope; UI writer is gated on F0-G1.

```yaml
exit_gate:
  - id: F3-G1
    description: Editor chart tests green. FAILS when save-content of an edited oferta drops the completa block, or when add-chart writes envelope before listCharts exists.
    verifier: { kind: shell, command: "pnpm exec vitest run tests/vue/chart-editor.test.ts tests/core/charts-envelope.test.ts", expectExitCode: 0 }
```

### T-001 Session edits the chart document

- Files: src/core/source-session.ts, src/vue/ChordproViewer.vue, tests/vue/chart-editor.test.ts
- scopeBoundary: Do not add collab; do not open the whole-file source pane as the default edit target; do not change OnSong convert-on-edit.
- acceptance: in edit mode the working source of the session is the active chart document; committing a lyric change calls replaceChart and emits the full file on update:source; sibling chart body is unchanged in that emit
- verifier: { kind: shell, command: "pnpm exec vitest run tests/vue/chart-editor.test.ts", expectExitCode: 0 }
- RED→GREEN: Edit a two-chart file in the session; emit currently would be the slice or the concat; wire replaceChart on commit.

### T-002 Add rename delete default

- Files: src/core/charts.ts, src/vue/ChordproViewer.vue, tests/vue/chart-editor.test.ts, tests/core/charts-envelope.test.ts
- scopeBoundary: Do not invent a second song title; do not allow deleting the last remaining chart (collapse to implicit default instead); do not write into fixtures/sda.
- acceptance: addChart duplicates the active chart document with a new chartId and label; renameChart changes x_chart_label only (chartId and overlay key stay); deleteChart of one of two remaining writes a one-chart file with no start_of_x_chart; setDefaultChart writes x_chart_default
- verifier: { kind: shell, command: "pnpm exec vitest run tests/vue/chart-editor.test.ts tests/core/charts-envelope.test.ts", expectExitCode: 0 }
- RED→GREEN: Failing CRUD tests on charts.ts helpers; then wire editor actions.

## F4 — Export e docs

Goal: exportCho default scope is file; PDF and download-this-chart use scope chart; filenames include chartId when N>1; VISAO/SPEC/CONSUMER/NAMING/README distinguish host song pick from in-file charts.

```yaml
exit_gate:
  - id: F4-G1
    description: Export scope tests green and docs name cifra vs música vs Minha versão. FAILS when exportCho() without opts on a two-chart source returns only the visible chart.
    verifier: { kind: shell, command: "pnpm exec vitest run tests/core/export-cho-charts.test.ts tests/core/filenames.test.ts", expectExitCode: 0 }
```

### T-001 exportCho scope and filenames

- Files: src/core/export-cho.ts, src/core/filenames.ts, src/vue/ChordproViewer.vue, tests/core/export-cho-charts.test.ts, tests/core/filenames.test.ts
- scopeBoundary: Do not change key-rewrite rules on {key:}; do not add a third PDF engine; do not treat file capo as live capo.
- acceptance: exportCho(twoChartSource) contains both start_of_x_chart blocks; exportCho(twoChartSource, { scope: "chart", chartId: "oferta" }) is the oferta chart document only; buildPdfFilename(title, key, "oferta") includes oferta when N>1; viewer PDF uses scope chart
- verifier: { kind: shell, command: "pnpm exec vitest run tests/core/export-cho-charts.test.ts tests/core/filenames.test.ts", expectExitCode: 0 }
- RED→GREEN: Failing default-scope test; add scope to exportCho and optional chartId to filenames.

### T-002 Docs VISAO SPEC CONSUMER NAMING README

- Files: docs/VISAO.md, SPEC.md, docs/CONSUMER.md, docs/NAMING.md, README.md
- scopeBoundary: Do not rewrite editor design.md; do not claim implementation DONE; do not document Portuguese write keys for the envelope.
- acceptance: VISAO table no longer lists in-file named charts as host-only multicifra; host multicifra remains which song string; CONSUMER documents source as the file, chartId prop, save as full file, suggestion chartId; NAMING lists start_of_x_chart, x_chart_label, x_chart_default; README features mention the title chip and that Minha versão is overlay
- verifier: { kind: shell, command: "node -e \"const fs=require('fs'); for (const f of ['docs/VISAO.md','SPEC.md','docs/CONSUMER.md','docs/NAMING.md','README.md']) { const t=fs.readFileSync(f,'utf8'); if (!/start_of_x_chart|chartId/.test(t) && f!=='docs/VISAO.md') throw new Error(f+' missing chart contract'); if (f==='docs/VISAO.md' && !/cifra/.test(t)) throw new Error('VISAO missing cifra language'); }\"", expectExitCode: 0 }
- RED→GREEN: Grep docs for the old host-only multicifra line; rewrite the boundary paragraphs to match design.md Decision 12 and 15.
