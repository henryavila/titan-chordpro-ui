---
schemaVersion: "0.1"
slug: versoes-cifra-f0-leitor-envelope-e-parse-fatiado
title: "Leitor: envelope e parse fatiado"
summary: Fatiar o .cho em cifras nomeadas no core, sem Vue.
goal: "`listCharts` e `parse(source, { chartId })` fatiam o arquivo; 1 cifra
  implícita é bit-compatível com o parse atual; N>1 não concatena corpos;
  writeMeta tem alvo song/chart; replaceChart reconstitui o arquivo. Sem Vue.
  Sem writer de UI."
status: done
branch: plan/versoes-cifra
started: 2026-09-20T15:40:57.297Z
lastUpdated: 2026-09-25T03:25:00.000Z
nextAction: null
parentPlan: versoes-cifra
phaseId: F0
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
    tests/demo/sda-fixtures.test.ts e tests/core/no-vue-in-core.test.ts verdes.
tasksDone: 3
tasksTotal: 3
gatesMet: 2
gatesTotal: 2
weightDone: 8
weightTotal: 8
exitGates:
  - id: F0-G1
    description: Envelope tests green. FAILS when parse of a two-chart source
      concatenates both bodies or last-write-wins key/duration across charts.
    status: met
    metAt: 2026-09-25T03:20:00.000Z
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/core/charts-envelope.test.ts
      expectExitCode: 0
    verifierLabel: "shell: pnpm exec vitest run tests/core/charts-envelope.test.ts"
    evidence:
      verifierKind: shell
      verifiedAt: 2026-09-25T03:10:28.000Z
      verifiedCommit: a6110ebe5601b8e1777cc5e57011295becf1c4fc
      passed: true
      exitCode: 0
      outputSummary: "Test Files 1 passed (1). Tests 104 passed (104). Exit 0."
  - id: F0-G2
    description: Existing one-chart parse still green on SDA fixtures and no Vue in core.
    status: met
    metAt: 2026-09-25T03:20:00.000Z
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/core/no-vue-in-core.test.ts
        tests/demo/sda-fixtures.test.ts
      expectExitCode: 0
    verifierLabel: "shell: pnpm exec vitest run tests/core/no-vue-in-core.test.ts test…"
    evidence:
      verifierKind: shell
      verifiedAt: 2026-09-25T03:10:36.000Z
      verifiedCommit: a6110ebe5601b8e1777cc5e57011295becf1c4fc
      passed: true
      exitCode: 0
      outputSummary: "Test Files 2 passed (2). Tests 5 passed (5). Exit 0."
stack:
  - id: 1
    title: "Leitor: envelope e parse fatiado"
    type: task
    openedAt: 2026-09-20T15:40:57.297Z
tasks:
  - id: T-001
    title: listCharts and implicit default
    summary: Listar cifras do arquivo e tratar arquivo antigo como cifra default.
    weight: 2
    status: done
    closedAt: 2026-09-25T02:51:12.000Z
    lastUpdated: 2026-09-25T02:51:12.000Z
    scopeBoundary:
      - Do not change Vue; do not write N-chart files into fixtures/sda; do not
        implement overlay keys; do not add the title chip.
    acceptance:
      - listCharts on a source with no start_of_x_chart returns one entry id
        default; listCharts on a source with two start_of_x_chart blocks returns
        those two ids in file order; x_chart_default marks isDefault;
        x_chart_label supplies label else the id; functions export from
        src/core/index.ts
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/core/charts-envelope.test.ts
      expectExitCode: 0
    evidence:
      verifierKind: shell
      verifiedAt: 2026-09-25T02:51:12.000Z
      verifiedCommit: 53d8a8ef42b1f4ad4360ea53ed9246aee62b37b8
      passed: true
      exitCode: 0
      outputSummary: "Test Files 1 passed (1). Tests 104 passed (104). Exit 0."
    outputs:
      - kind: file
        path: src/core/charts.ts
      - kind: file
        path: src/core/index.ts
      - kind: file
        path: tests/core/charts-envelope.test.ts
  - id: T-002
    title: parse fatiado does not concatenate
    summary: parse de N cifras devolve só a cifra pedida, nunca os corpos colados.
    weight: 3
    status: done
    closedAt: 2026-09-25T02:51:12.000Z
    lastUpdated: 2026-09-25T02:51:12.000Z
    scopeBoundary:
      - Do not drop soc/eoc/tab/score behaviour; do not invent SDA lyrics; do
        not migrate overlay storage.
    evidence:
      verifierKind: shell
      verifiedAt: 2026-09-25T02:51:12.000Z
      verifiedCommit: 53d8a8ef42b1f4ad4360ea53ed9246aee62b37b8
      passed: true
      exitCode: 0
      outputSummary: "Test Files 1 passed (1). Tests 104 passed (104). Exit 0."
    acceptance:
      - 'parse(twoChartSource) without opts uses the default chart only;
        parse(twoChartSource, { chartId: "oferta" }) meta.key and duration are
        the oferta block values; sections contain oferta lyrics and not completa
        lyrics; view.source is the chart document (song title/artist plus that
        chart) with no sibling body; a one-chart jesus-style string still parses
        with the same title and section count as today'
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/core/charts-envelope.test.ts
      expectExitCode: 0
    outputs:
      - kind: file
        path: src/core/parse.ts
      - kind: file
        path: src/core/charts.ts
      - kind: file
        path: tests/core/charts-envelope.test.ts
  - id: T-003
    title: writeMeta target and replaceChart
    summary: Reescrever meta da música ou da cifra sem apagar a irmã.
    weight: 3
    status: done
    closedAt: 2026-09-25T02:51:12.000Z
    lastUpdated: 2026-09-25T02:51:12.000Z
    scopeBoundary:
      - Do not change Vue; do not add META_KEYS that collide with
        start_of_x_chart; do not rewrite fixtures/sda.
    evidence:
      verifierKind: shell
      verifiedAt: 2026-09-25T02:51:12.000Z
      verifiedCommit: 53d8a8ef42b1f4ad4360ea53ed9246aee62b37b8
      passed: true
      exitCode: 0
      outputSummary: "Test Files 1 passed (1). Tests 104 passed (104). Exit 0."
    acceptance:
      - 'writeMeta(file, { title: "X" }, { target: "song" }) changes the song
        header and leaves both chart keys intact; writeMeta(file, { key: "G",
        duration: "03:00" }, { target: "chart", chartId: "oferta" }) changes
        only oferta; replaceChart(file, "oferta", chartDocument) substitutes
        that chart document and keeps the sibling; one-chart writeMeta without
        target still matches current header rewrite'
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/core/charts-envelope.test.ts
      expectExitCode: 0
    outputs:
      - kind: file
        path: src/core/import-chordpro.ts
      - kind: file
        path: src/core/charts.ts
      - kind: file
        path: tests/core/charts-envelope.test.ts
parked: []
emerged: []
planTitle: Cifras nomeadas da mesma música — `titan-chordpro-ui`
planActive: true
current: true
---

# Narrative / notes

Initiative for phase **F0 — Leitor: envelope e parse fatiado**.

## Decisions

- 2026-09-23: operator ratified F0 phase-start package (BI spine unchanged).
- 2026-09-20: operator stamped `executionMode: automate` and locked flow.

## Links

- Plan: `.atomic-skills/projects/titan-chordpro-ui/versoes-cifra/plan.md`
- Design: `projects/titan-chordpro-ui/versoes-cifra/design.md`

## Self-review against code-quality gates

- G1 read-before-claim: applied — T-001 T-002 T-003 closed on verifier evidence; F0-G1 104 tests and F0-G2 5 tests at `a6110ebe5601b8e1777cc5e57011295becf1c4fc`
- G2 soft-language: applied — exit gates are `passed: true` with exit code 0
- G6 reference-or-strike: applied — handoff literals are verbatim paths and SHAs

## Session handoff

F0 fechou em 2026-09-25. O operador escreveu "feche f0 e continue sem esperar". O pacote de decisões está em `.atomic-skills/reviews/decision-package-versoes-cifra-F0.md`. Auditoria PARTIAL: o leitor entregue; docs e o MetaDialog ficam registrados, sem reabrir o F0.

### Where

- Plan worktree: `/Users/henry/.grok/worktrees/code-titan-chordpro-ui/multiverson/.worktrees/versoes-cifra`
- Branch: `plan/versoes-cifra`. `currentPhase: F1`. F1 segue `pending` até materializar.
- Product SHA reviewed: `a6110ebe5601b8e1777cc5e57011295becf1c4fc`
- Lessons: `.atomic-skills/projects/titan-chordpro-ui/versoes-cifra/lessons/versoes-cifra-f0-leitor-envelope-e-parse-fatiado.md`
- Claims exclusivos: T-001 `275abe489d77d53c88d0d0e8a4207619b044edaa`, T-002 `064926f71aba1ad9cb569ddef50aa550971e092e`, T-003 `904c00673a08fe93ba6c1a767ff9a6a2ac776bf4`

### Single nextAction

Materializar F1 a partir de `phases/f1-overlay-e-sugestao-por-cifra.source.json` com a espinha já ratificada pelo "continue sem esperar", depois spawn do writer code-only.

### Verbatim state

- `CI=true pnpm exec vitest run tests/core/charts-envelope.test.ts` — Test Files 1 passed (1). Tests 104 passed (104). Exit 0.
- `CI=true pnpm exec vitest run tests/core/no-vue-in-core.test.ts tests/demo/sda-fixtures.test.ts` — Test Files 2 passed (2). Tests 5 passed (5). Exit 0.
- `node scripts/assert-automate-gate.js --plan versoes-cifra --project titan-chordpro-ui --gate phase-done` — ok

### Uncommitted changes

State files of this close, not yet committed at the moment this block was written.
