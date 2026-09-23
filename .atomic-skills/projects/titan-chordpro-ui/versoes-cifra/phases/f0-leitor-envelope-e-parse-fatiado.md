---
schemaVersion: "0.1"
slug: versoes-cifra-f0-leitor-envelope-e-parse-fatiado
title: "Leitor: envelope e parse fatiado"
summary: Fatiar o .cho em cifras nomeadas no core, sem Vue.
goal: "`listCharts` e `parse(source, { chartId })` fatiam o arquivo; 1 cifra
  implícita é bit-compatível com o parse atual; N>1 não concatena corpos;
  writeMeta tem alvo song/chart; replaceChart reconstitui o arquivo. Sem Vue.
  Sem writer de UI."
status: active
branch: plan/versoes-cifra
started: 2026-09-20T15:40:57.297Z
lastUpdated: 2026-09-20T15:40:57.297Z
nextAction: "Start T-001: listCharts and implicit default"
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
tasksDone: 0
tasksTotal: 3
gatesMet: 0
gatesTotal: 2
weightDone: 0
weightTotal: 8
exitGates:
  - id: F0-G1
    description: Envelope tests green. FAILS when parse of a two-chart source
      concatenates both bodies or last-write-wins key/duration across charts.
    status: pending
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/core/charts-envelope.test.ts
      expectExitCode: 0
    verifierLabel: "shell: pnpm exec vitest run tests/core/charts-envelope.test.ts"
  - id: F0-G2
    description: Existing one-chart parse still green on SDA fixtures and no Vue in core.
    status: pending
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/core/no-vue-in-core.test.ts
        tests/demo/sda-fixtures.test.ts
      expectExitCode: 0
    verifierLabel: "shell: pnpm exec vitest run tests/core/no-vue-in-core.test.ts test…"
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
    status: pending
    lastUpdated: 2026-09-20T15:40:57.297Z
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
    status: pending
    lastUpdated: 2026-09-20T15:40:57.297Z
    scopeBoundary:
      - Do not drop soc/eoc/tab/score behaviour; do not invent SDA lyrics; do
        not migrate overlay storage.
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
    status: pending
    lastUpdated: 2026-09-20T15:40:57.297Z
    scopeBoundary:
      - Do not change Vue; do not add META_KEYS that collide with
        start_of_x_chart; do not rewrite fixtures/sda.
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

## Session handoff
- **Narrative:** F0 product is on `plan/versoes-cifra`. `readMeta` on an envelope is the default chart (`26083d9`, merge `64e3dea`). Tasks T-001, T-002, and T-003 are still pending. A `mode: both` review of `742f839..d9b5d22` is `needs_changes` (Codex informed: 1 blocker, 2 critical, 1 major). Nothing was dropped. `done` is blocked until the operator dispositions those findings.
- **Decision log:** Operator 2026-09-23 said continue the whole plan as orchestrator only. Two ceiling overrides already ran (replaceChart, then readMeta). The both review is not a disposition. Screen bugs (block edit indexes, transpose using every chart) and clear-by-delete on audio are open.
- **Single nextAction:** Await operator disposition `accept|defer|fix` on the both review `.atomic-skills/reviews/2026-09-23-versoes-cifra-f0-both.md` before `done`.
- **Verbatim state:** Cursor `.atomic-skills/status/automate/versoes-cifra.json` step E, redispatchCount 4, lease missing. Claim SHAs: T-001 `275abe489d77d53c88d0d0e8a4207619b044edaa`, T-002 `b59b3b3730bb033e96b35d088b9c2dcb29508dcc`, T-003 `26083d936399fca1501018d2725d5dd56102f1ab`. Plan-tree `pnpm exec vitest run tests/core/charts-envelope.test.ts` exit 0 (24). `pnpm exec vitest run tests/core/import-chordpro.test.ts` exit 0 (43). `pnpm exec vitest run tests/core/no-vue-in-core.test.ts tests/demo/sda-fixtures.test.ts` exit 0 (5). Codex pass 2 `.atomic-skills/reviews/2026-09-23-versoes-cifra-f0-codex-r2.md`. Local `.atomic-skills/reviews/2026-09-23-versoes-cifra-f0-local-r3.md`.
- **Uncommitted changes:** unrelated scratch only: `?? .atomic-skills/.aideck/`, `?? .atomic-skills/_drafts/`, `?? .atomic-skills/status/automate/versoes-cifra-F0-prepare.json`, `?? .atomic-skills/status/automate/versoes-cifra-F0-sealed-brief.md`.
