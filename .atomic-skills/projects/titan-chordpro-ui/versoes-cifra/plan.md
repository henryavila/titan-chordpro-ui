---
schemaVersion: "0.1"
slug: versoes-cifra
title: Cifras nomeadas da mesma música — `titan-chordpro-ui`
version: "1.0"
status: active
executionMode: automate
started: 2026-09-20T15:40:57.297Z
lastUpdated: 2026-09-25T03:25:00.000Z
branch: plan/versoes-cifra
currentPhase: F1
parallelismAllowed: false
principles:
  - id: P1
    title: Reader before writer
    body: "Parse, listCharts, seletor e overlay keyed existem e estão verdes antes
      de qualquer writer gravar envelope N>1. verified_by: design.md Decision
      14, Blast radius."
  - id: P2
    title: Um arquivo = uma música
    body: "`songId` e o item da setlist não mudam ao trocar cifra. `{new_song}` é
      proibido. verified_by: design.md Decisions 1–2, Rejected alternatives."
  - id: P3
    title: Identidade tripla
    body: "`songId` (música), `chartId` (cifra), overlay
      `cpv:my:{songId}:{chartId}`. Ops de sugestão no documento da cifra, não no
      arquivo concatenado. verified_by: design.md Decisions 3, 8."
  - id: P4
    title: Setlist não é switcher de cifra
    body: "Swipe de borda, dock e `songs[]` continuam N músicas. Cifra troca no chip
      do título. verified_by: design.md Decision 6; `src/vue/use/useSetlist.ts`
      L45–55 (ensaio = lista de músicas), L80–82 (id duplicado uniquifica porque
      compartilhariam overlay); `src/vue/ChordproViewer.vue` L2390 `goSong`."
  - id: P5
    title: Core sem Vue
    body: "Envelope, listCharts, parse fatiado, replaceChart, writeMeta target vivem
      em `src/core`. Chip e editor em Vue. verified_by:
      `tests/core/no-vue-in-core.test.ts` L19–28; AGENTS.md L6."
  - id: P6
    title: Fixtures SDA intactas
    body: "`fixtures/sda` permanece 1 cifra por arquivo. Envelope N>1 usa string
      mínima no teste, não cifra SDA inventada. verified_by: AGENTS.md L5;
      `tests/demo/sda-fixtures.test.ts` L18–20; design.md Decision 14."
glossary:
  - term: música
    definition: Unidade de catálogo / setlist / `songId`. Um `.cho`.
  - term: cifra
    definition: Arranjo nomeado dentro do arquivo (`chartId` + rótulo). Não se chama
      versão.
  - term: documento da cifra
    definition: "ChordPro de uma cifra: header da música + meta sonora + corpo, sem
      irmãs. Alvo de overlay e edição."
  - term: envelope
    definition: "`{start_of_x_chart: id}` … `{end_of_x_chart}`. Ausente = cifra
      implícita `default`."
  - term: Minha versão
    definition: Overlay pessoal. Continua overlay, não é uma cifra oficial.
phases:
  - id: F0
    slug: versoes-cifra-f0-leitor-envelope-e-parse-fatiado
    title: "Leitor: envelope e parse fatiado"
    summary: Fatiar o .cho em cifras nomeadas no core, sem Vue.
    goal: "`listCharts` e `parse(source, { chartId })` fatiam o arquivo; 1 cifra
      implícita é bit-compatível com o parse atual; N>1 não concatena corpos;
      writeMeta tem alvo song/chart; writeMeta sem target em N>1 não achata
      key/duration das cifras no header; replaceChart reconstitui o arquivo. Sem
      Vue. Sem writer de UI. verified_by: tests/helpers/load-fixture.ts L11
      (JESUS_1); design.md Decision 4 (sem target só 1-cifra é o comportamento
      atual)."
    dependsOn: []
    subPhaseCount: 3
    exitGate:
      summary: 2 criteria to meet
      criteria:
        - id: F0-G1
          description: Envelope tests green. FAILS when parse of a two-chart source
            concatenates both bodies or last-write-wins key/duration across
            charts.
          status: met
          metAt: 2026-09-25T03:20:00.000Z
          verifier:
            kind: shell
            command: pnpm exec vitest run tests/core/charts-envelope.test.ts
            expectExitCode: 0
          evidence:
            verifierKind: shell
            verifiedAt: 2026-09-25T03:10:28.000Z
            verifiedCommit: a6110ebe5601b8e1777cc5e57011295becf1c4fc
            passed: true
            exitCode: 0
            outputSummary: "Test Files 1 passed (1). Tests 104 passed (104). Exit 0."
        - id: F0-G2
          description: Existing one-chart parse still green on SDA fixtures and no Vue in
            core.
          status: met
          metAt: 2026-09-25T03:20:00.000Z
          verifier:
            kind: shell
            command: pnpm exec vitest run tests/core/no-vue-in-core.test.ts
              tests/demo/sda-fixtures.test.ts
            expectExitCode: 0
          evidence:
            verifierKind: shell
            verifiedAt: 2026-09-25T03:10:36.000Z
            verifiedCommit: a6110ebe5601b8e1777cc5e57011295becf1c4fc
            passed: true
            exitCode: 0
            outputSummary: "Test Files 2 passed (2). Tests 5 passed (5). Exit 0."
    status: done
    businessIntent:
      value: O músico lê N cifras nomeadas da mesma música no mesmo arquivo, sem
        concatenar corpos nem last-write de tom/duração.
      workflow: listCharts + parse fatiado + writeMeta com alvo song/chart +
        replaceChart no core, cobertos por tests/core/charts-envelope.test.ts.
      rules: Reader before writer. Arquivo sem envelope = cifra default, parse
        idêntico ao de hoje. Sem Vue. Sem gravar N>1 em fixtures/sda. Sem
        {new_song}.
      outOfScope: Chip no título, CRUD no editor, overlay key, Suggestion.chartId,
        exportCho scope, docs VISAO/CONSUMER.
      doneWhen: tests/core/charts-envelope.test.ts verde;
        tests/demo/sda-fixtures.test.ts e tests/core/no-vue-in-core.test.ts
        verdes.
    evaluationGate:
      status: passed
      verdict: pass
      reportPath: .atomic-skills/reviews/eval-versoes-cifra-F0.md
      at: c84fdc956fdee4eb16510e1ebbc2e20a44fdc1b0
      verifiedAt: 2026-09-25T02:53:30.000Z
    lessonsState: recorded
    lessonsPath: .atomic-skills/projects/titan-chordpro-ui/versoes-cifra/lessons/versoes-cifra-f0-leitor-envelope-e-parse-fatiado.md
    reviewGate:
      status: passed
      mode: both
      at: a6110ebe5601b8e1777cc5e57011295becf1c4fc
      reviewFile: .atomic-skills/reviews/2026-09-24-fix28-both.md
      localReceiptPath: .atomic-skills/reviews/2026-09-25-fix28-local.md
      codexReceiptPath: .atomic-skills/reviews/2026-09-24-fix28-codex-pass2.md
      verifiedAt: 2026-09-25T03:20:00.000Z
    decisionReview:
      status: passed
      verifiedAt: 2026-09-25T03:20:00.000Z
      packagePresentedAt: 2026-09-25T03:15:00.000Z
      packagePath: .atomic-skills/reviews/decision-package-versoes-cifra-F0.md
    deliveryAuditGate:
      status: passed
      verdict: PARTIAL
      reportPath: .atomic-skills/reviews/audit-delivery-versoes-cifra-F0.md
      verifiedAt: 2026-09-25T03:20:00.000Z
  - id: F1
    slug: versoes-cifra-f1-overlay-e-sugestao-por-cifra
    title: Overlay e sugestão por cifra
    summary: Overlay e sugestão passam a ser por música+cifra, não pelo arquivo inteiro.
    goal: overlay key is cpv:my:{songId}:{chartId}; legacy cpv:my:{songId} reads as
      chart default; Suggestion carries chartId; TextOp.at is against the chart
      document; accept splices via replaceChart and save-content emits the whole
      file.
    dependsOn:
      - F0
    subPhaseCount: 0
    exitGate:
      summary: 1 criterion to meet
      criteria:
        - id: F1-G1
          description: Overlay/suggestion chart-id tests green. FAILS when ops at-line
            from oferta apply into completa, or legacy overlay key is dropped
            without mapping to default, or Suggestion lacks chartId, or
            accept/save-content emits only the visible chart.
          status: pending
          verifier:
            kind: shell
            command: pnpm exec vitest run tests/core/overlay.test.ts
              tests/vue/overlay-ui.test.ts tests/vue/storage-seam.test.ts
            expectExitCode: 0
    status: pending
  - id: F2
    slug: versoes-cifra-f2-viewer-seletor-de-cifra
    title: "Viewer: seletor de cifra"
    summary: Chip no título troca a cifra sem usar a setlist nem o swipe de música.
    goal: "With N>1, a compact control on the title shows the active chart label and
      switches chartId without goSong; N=1 hides it; swipe/dock/setlist still
      change songs; live capo/offset/speed/scroll and metronome BPM persist per
      (songId, chartId); timeline and rehearsal audio reload from the new chart
      document. verified_by: design.md Decision 7; Ground-truth B4
      (`STORE_KEYS.bpm` is title|artist today)."
    dependsOn:
      - F1
    subPhaseCount: 0
    exitGate:
      summary: 1 criterion to meet
      criteria:
        - id: F2-G1
          description: Chart switcher tests green. FAILS when switching chart calls
            setlist go, or when N=1 still shows the chip, or when swipe on the
            rail changes chartId, or when live capo/offset/speed/scroll/BPM of
            chart A leak onto chart B, or when timeline/audio stay on the
            previous chart document.
          status: pending
          verifier:
            kind: shell
            command: pnpm exec vitest run tests/vue/chart-switcher.test.ts
              tests/vue/setlist.test.ts tests/vue/song-swipe.test.ts
              tests/vue/audio-ref.test.ts
            expectExitCode: 0
    status: pending
  - id: F3
    slug: versoes-cifra-f3-editor-escrever-cifras
    title: "Editor: escrever cifras"
    summary: Editor grava o arquivo inteiro e cria/renomeia/apaga cifras nomeadas.
    goal: Edit session works on the chart document; save-content and update:source
      emit the full file; add/rename/delete/default exist; deleting the last
      named chart writes a one-chart file with no envelope; UI writer ships only
      after P1 (F0 parse/listCharts, F1 overlay keyed, F2 seletor green), not
      after F0-G1 alone.
    dependsOn:
      - F2
    subPhaseCount: 0
    exitGate:
      summary: 1 criterion to meet
      criteria:
        - id: F3-G1
          description: Editor chart tests green. FAILS when save-content of an edited
            oferta drops the completa block, or when addChart writes N>1
            envelope that listCharts cannot read, or when deleting the last
            named chart leaves start_of_x_chart in the file.
          status: pending
          verifier:
            kind: shell
            command: pnpm exec vitest run tests/vue/chart-editor.test.ts
              tests/core/charts-envelope.test.ts
            expectExitCode: 0
    status: pending
  - id: F4
    slug: versoes-cifra-f4-export-e-docs
    title: Export e docs
    summary: Export tem dois verbos (arquivo vs cifra visível) e os docs separam
      música de cifra.
    goal: exportCho default scope is file; PDF and download-this-chart use scope
      chart; filenames include chartId when N>1;
      VISAO/SPEC/CONSUMER/NAMING/README distinguish host song pick from in-file
      charts.
    dependsOn:
      - F3
    subPhaseCount: 0
    exitGate:
      summary: 2 criteria to meet
      criteria:
        - id: F4-G1
          description: Export scope tests green. FAILS when exportCho() without opts on a
            two-chart source returns only the visible chart.
          status: pending
          verifier:
            kind: shell
            command: pnpm exec vitest run tests/core/export-cho-charts.test.ts
              tests/core/filenames.test.ts
            expectExitCode: 0
        - id: F4-G2
          description: Docs name cifra vs música vs Minha versão and document
            chartId/save=file. FAILS when VISAO still treats in-file named
            charts as host-only multicifra, or NAMING omits start_of_x_chart.
          status: pending
          verifier:
            kind: shell
            command: node -e 'const fs=require("fs"); const
              files=["docs/VISAO.md","SPEC.md","docs/CONSUMER.md","docs/NAMING.md","README.md"];
              for (const f of files) { const t=fs.readFileSync(f,"utf8"); if
              (!/start_of_x_chart|chartId|cifras nomeadas/.test(t)) throw new
              Error(f+" missing in-file chart contract"); }'
            expectExitCode: 0
    status: pending
references: []
planActive: true
planTitle: Cifras nomeadas da mesma música — `titan-chordpro-ui`
---

# Cifras nomeadas da mesma música — `titan-chordpro-ui`

## 1. Context

Uma música tem várias cifras (oferta, completa, simplificada, louvor). Este plano coloca N cifras nomeadas no mesmo `.cho`, fatia o parse, troca no viewer/editor, e recorta overlay/sugestão por cifra. SoT: `projects/titan-chordpro-ui/versoes-cifra/design.md`. verified_by: design.md Decisions 1–15.

## 2. Inviolable principles

- **P1 Reader before writer** — Parse, listCharts, seletor e overlay keyed existem e estão verdes antes de qualquer writer gravar envelope N>1. verified_by: design.md Decision 14, Blast radius.
- **P2 Um arquivo = uma música** — `songId` e o item da setlist não mudam ao trocar cifra. `{new_song}` é proibido. verified_by: design.md Decisions 1–2, Rejected alternatives.
- **P3 Identidade tripla** — `songId` (música), `chartId` (cifra), overlay `cpv:my:{songId}:{chartId}`. Ops de sugestão no documento da cifra, não no arquivo concatenado. verified_by: design.md Decisions 3, 8.
- **P4 Setlist não é switcher de cifra** — Swipe de borda, dock e `songs[]` continuam N músicas. Cifra troca no chip do título. verified_by: design.md Decision 6; `src/vue/use/useSetlist.ts` L45–55, L80–82; `src/vue/ChordproViewer.vue` L2390 `goSong`.
- **P5 Core sem Vue** — Envelope, listCharts, parse fatiado, replaceChart, writeMeta target vivem em `src/core`. Chip e editor em Vue. verified_by: `tests/core/no-vue-in-core.test.ts` L19–28; AGENTS.md L6.
- **P6 Fixtures SDA intactas** — `fixtures/sda` permanece 1 cifra por arquivo. Envelope N>1 usa string mínima no teste, não cifra SDA inventada. verified_by: AGENTS.md L5; `tests/demo/sda-fixtures.test.ts` L18–20; design.md Decision 14.

## 3. Phase tree

_(Canonical list in frontmatter `phases:`. aiDeck renders the tree visually when running.)_

F0 está fechada e arquivada (`phases/archive/f0-leitor-envelope-e-parse-fatiado.md`). F1–F4 continuam descritor-only até o pacote de cada fase ser materializado. verified_by: frontmatter `currentPhase: F1`; `phases/` directory.

## Ground-truth review

**Status:** complete-with-findings
**Codebase class:** populated
**Scanned:** `src/core/*.ts` (27; no `charts.ts`), `src/vue/{public.ts,ChordproViewer.vue,use/useSetlist.ts,use/useOverlay.ts,use/useMetronome.ts,use/song-swipe.ts,chrome/CpvViewHead.vue,edit/NewChartDialog.vue,edit/MetaDialog.vue}`, `src/cli/index.ts`, `tests/core/{no-vue-in-core,overlay,parse,filenames,import-chordpro,timeline-charts}.test.ts`, `tests/demo/sda-fixtures.test.ts`, `tests/vue/{setlist,song-swipe,overlay-ui,storage-seam,head-chip,audio-ref,new-chart}.test.ts`, `docs/{VISAO,CONSUMER,NAMING}.md`, `SPEC.md`, `README.md`, `AGENTS.md`, `fixtures/sda` (148 `.cho`), `design-source/design_handoff_chordpro_viewer/GAPS.md` → 27 core + listed vue/cli/tests/docs + 148 fixtures
**Commit:** 6c5fc66
**At:** 2026-09-23T01:20:25Z

### A — Plan premises vs code

| # | Premise | Result | Evidence |
|---|---------|--------|----------|
| 1 | `parse(source: string)` exists; no `chartId` opts | ok | `src/core/parse.ts:300` `export function parse(source: string)` |
| 2 | `DIR = [a-zA-Z_]+` consumes unknown directives (would drop `{start_of_x_chart}`); meta last-write-wins; bodies concatenate | ok | `parse.ts:28`, `117-163` (`continue` after key/duration/capo) |
| 3 | `{soc}`/`{eoc}`/`{sot}`/`{eot}`/`{sos}`/`{eos}` exist and must not be dropped | ok | `parse.ts:120-140` |
| 4 | No `{new_song}` / `{ns}` branch; GAPS omits it | ok | `parse.ts:117-163`; `GAPS.md:34` (`{new_page}` listed, not `{new_song}`) |
| 5 | `src/core/index.ts` exports `parse`, `writeMeta`, `overlayKey`, `exportCho` | ok | `index.ts:36`, `43`, `217` |
| 6 | `writeMeta(source, ChartMeta)` is two-arg; `META_KEYS` rewrites one canonical header | ok | `import-chordpro.ts:344-363`, `447-459` |
| 7 | `tests/core/no-vue-in-core.test.ts` exists | ok | `no-vue-in-core.test.ts:19-27` |
| 8 | `fixtures/sda` is 148 live one-chart files | ok | `tests/demo/sda-fixtures.test.ts:18-20` (`guarda uma cifra viva por arquivo`) |
| 9 | `useSetlist.ts`: `songs[]`, id uniquify, `SongSpot`, `go()` | ok | `useSetlist.ts:5-14`, `74-84`, `170` |
| 10 | `overlayKey(songId)` is `cpv:my:{songId}` (no chart suffix) | ok | `storage.ts:37-43` |
| 11 | `Suggestion` has `songId` + `baseVersion`, no `chartId`; `TextOp.at`; `TuneOp` | ok | `overlay.ts:20-41`, `413-429` |
| 12 | Overlay tests exist (`overlay.test.ts`, `overlay-ui.test.ts`, `storage-seam.test.ts`) | ok | files present; `storage-seam.test.ts` uses `overlayKey('jesus-1')` |
| 13 | `useOverlay` keys overlay by `songId`; `acceptOp` applies to full `official` | ok | `useOverlay.ts:140`, `630-644` |
| 14 | `public.ts`: `songId`, `version`, `persistSuggestion`, `songs`; no `chartId` | ok | `public.ts:146-163` |
| 15 | `goSong` / `syncHostSource` exist (F2 must not reuse for cifra) | ok | `ChordproViewer.vue:2316`, `2390` |
| 16 | `CpvViewHead`, `SetlistSheet`, `CpvEndOffer`, `SWIPE_RAIL_PX` exist | ok | `CpvViewHead.vue`; `sheets/SetlistSheet.vue`; `chrome/CpvEndOffer.vue`; `song-swipe.ts:16` |
| 17 | `source-session.getView` → `parse(source)`; `setMeta` → `writeMeta` two-arg | ok | `source-session.ts:52`, `64-70` |
| 18 | `exportCho(source, { key, semitones, capo })` has no `scope`; `buildPdfFilename(title, key)` has no `chartId` | ok | `export-cho.ts:3-5`; `filenames.ts:21-24` |
| 19 | Existing tests named by F1–F4 gates: `setlist`, `song-swipe`, `audio-ref`, `filenames` | ok | `tests/vue/{setlist,song-swipe,audio-ref}.test.ts`; `tests/core/filenames.test.ts` |
| 20 | VISAO/SPEC treat multicifra as host “which string” | ok | `docs/VISAO.md:15,51,158`; `SPEC.md:28,56,74` |
| 21 | CONSUMER setlist is N músicas; NAMING `x_*` list has no envelope tags | ok | `docs/CONSUMER.md:252-290`; `docs/NAMING.md:50-57` |
| 22 | jesus-1 fixture, design SoT, AGENTS.md, README.md exist | ok | `tests/helpers/load-fixture.ts:11`; `projects/titan-chordpro-ui/versoes-cifra/design.md`; `AGENTS.md`; `README.md` |
| 23 | `audioTracksOf` reads via `readMeta` (not `parse().meta`); `ChordProView.source` is the full normalized file | ok | `audio-url.ts:83-89`; `parse.ts:304-311` |
| 24 | `writeMeta` one-header contract is tested | ok | `tests/core/import-chordpro.test.ts:153-169` |
| 25 | `charts.ts`, `charts-envelope.test.ts`, `chart-switcher.test.ts`, `chart-editor.test.ts`, `export-cho-charts.test.ts` | n/a (create) | F0 created `src/core/charts.ts` and `tests/core/charts-envelope.test.ts` (commits `275abe4`, `5841b8f`). `chart-switcher.test.ts`, `chart-editor.test.ts`, `export-cho-charts.test.ts` still absent — later-phase outputs |

### B — Code present, plan silent (impact candidates)

| # | Finding | Location | Impact | Disposition |
|---|---------|----------|--------|-------------|
| 1 | Many `writeMeta(source, meta)` clients (audio, key-rewrite, strum, session, MetaDialog, NewChartDialog). Two-arg hoist of all `META_KEYS` to one header. | `audio-url.ts:72,79`; `import-chordpro.ts:440,561`; `source-session.ts:70`; `MetaDialog.vue:176`; `NewChartDialog.vue:219,364` | direct | F0 T-003 keeps two-arg one-chart behaviour. N>1 callers must pass `{ target }` or operate on the chart document (F3 T-001 `source-session`; MetaDialog/audio/strum follow the chart document, not the envelope). |
| 2 | Second header writer `patchMeta` (in-place, first matching key) | `export-cho.ts:32`; `tests/core/lint-meta.test.ts:60-85` | indirect | oos F0. Do not use `patchMeta` for chart-scoped `{key:}`/`{duration:}` — it would hit the first occurrence in the file. |
| 3 | `readMeta` is first-canonical; `parse` is last-write-wins on the same duplicate keys | `import-chordpro.ts:382-396`; `parse.ts:151-163` | direct | F0 T-002/T-003 must slice the chart before either helper. `writeMeta` `target:chart` must not `readMeta` the whole file. |
| 4 | Setlist `SongSpot` keyed only by song id; metronome BPM keyed by `title\|artist`, not `songId` | `useSetlist.ts:63,181`; `ChordproViewer.vue:1007-1009`; `storage.ts:32`; `useMetronome.ts:90-104` | direct | F2 T-002: persist live capo/offset/scroll/`mul` per `(songId, chartId)`. Fold BPM (`STORE_KEYS.bpm`) into that pair or speed leaks across cifras. Plan F2 goal omitted BPM — treat as F2 T-002 scope. |
| 5 | Viewer export uses `exportSource()` (overlay-applied official/live, full file). `exportCho` already rewrites `{key:}` when `semitones !== 0`. | `ChordproViewer.vue:2082-2087,2106`; `export-cho.ts:13-18` | direct | F4 T-001: default `scope=file`; PDF/download-this-chart `scope=chart`. Do not change the `{key:}` rewrite rule (F4 T-001 scopeBoundary). |
| 6 | `NewChartDialog` is “nova música” (import/blank `.cho`), not in-file add-chart | `src/vue/edit/NewChartDialog.vue:11-15`; `tests/vue/new-chart.test.ts` | direct | F3 add/rename/delete must not reuse this dialog. oos of F3 addChart; keep as host-level new-file flow. |
| 7 | Title bar already paints `.cpv-head-chip` (setlist pos + Tom). `head-chip.test.ts` locks invert contrast. | `CpvViewHead.vue:37,60`; `tests/vue/head-chip.test.ts:8-10` | direct | F2 T-001 chip on `CpvViewHead`; keep `.cpv-head-chip` invert contract. Do not steal the Tom chip. |
| 8 | `createViewerController` and CLI call `parse(source)` with no opts; CLI PDF/slides use `buildPdfFilename(title, key)` | `controller.ts:17`; `src/cli/index.ts:6-13,166` | indirect | Accepted residual F0: `parse()` without opts uses default chart (T-002). F4 T-001 filenames; CLI follows export `scope`. |
| 9 | `Suggestion.baseVersion` + prop `version` are file etags; no `chartRevision`. `acceptOp` writes the whole official string. | `overlay.ts:45-48,413-418`; `public.ts:162-163`; `useOverlay.ts:630-651` | direct | F1 T-002: `Suggestion.chartId`; accept via `replaceChart` then `save-content` of the full file. Design D11: do not refuse Completa ops because Oferta published. Fold `chartRevision`/hash into F1 T-002. |
| 10 | Slides path (`lyrics-for-slides`, `buildSljaFilename`) is the same “visible chart” verb as PDF; F4 T-001 acceptance names only PDF/CHO | `ChordproViewer.vue:2141-2148`; `filenames.ts:27-29` | indirect | F4 T-001 / design D10: slides = `scope:chart` like PDF. Not a third engine. |
| 11 | `public.ts` comments `songId` as “Identity of the chart” (song, not cifra) | `public.ts:147-148` | indirect | F2/F4: add `chartId`; do not rename `songId`. F4 T-002 docs distinguish música vs cifra. |

**Counts:** premises=25 (missing=0, false=0); impacts=11 (direct=8, indirect=3)

## Reviews

- internal: clean | mode=local | @ 2026-09-20T15:58:00Z
- ground-truth: complete-with-findings | mode=ground-truth | fp=55b5cd1dd50f | premises=25 | impacts=11 @ 59984b3 (2026-09-23T22:29:56-03:00)
- cross-model: SKIPPED — operator: estou sem créditos para usar outro modelo de ar vamos continuar sem revisão externa.
