---
schemaVersion: "0.1"
slug: batida-editor-f2-b2-multi-pattern-named-persistence
title: B2 Multi-pattern named + persistence
summary: Vários padrões nomeados com persistência compatível.
goal: Multiple named patterns selectable in UI; persistence schema documented
  and implemented without breaking legacy single `{x_strum:}` parse; CC import
  keeps patterns 2..N when multi writer exists.
status: done
branch: plan/batida-editor
started: 2026-09-13T23:05:05.978Z
lastUpdated: 2026-09-13T23:05:05.978Z
nextAction: "Start T-001: Multi-pattern wire format + import keep-all"
parentPlan: batida-editor
phaseId: F2
businessIntent:
  value: Vários padrões nomeados persistidos sem quebrar x_strum legado.
  workflow: Schema multi + import keep-all → Vue canPick + sheet rename/dup/delete/add.
  rules: parse legado intacto; multi opt-in; sem amarração letra.
  outOfScope: Enrich conflict UI rica (F3); presets changes beyond active pattern.
  doneWhen: strum-multi + batida-multi + strum.test verdes.
tasksDone: 2
tasksTotal: 2
gatesMet: 1
gatesTotal: 1
weightDone: 6
weightTotal: 6
exitGates:
  - id: F2-G1
    description: Multi-pattern parse/format + selector tests green; legacy single
      x_strum still parses.
    status: met
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/core/strum-multi.test.ts
        tests/vue/batida-multi.test.ts tests/core/strum.test.ts
      expectExitCode: 0
    metAt: 2026-09-13T23:05:05.978Z
    verifierLabel: "shell: pnpm exec vitest run tests/core/strum-multi.test.ts tests/v…"
    evidenceSummary: met · 2026-09-13
tasks:
  - id: T-001
    title: Multi-pattern wire format + import keep-all
    summary: Multi-pattern wire format + import keep-all
    weight: 3
    status: done
    lastUpdated: 2026-09-13T23:05:05.978Z
    scopeBoundary:
      - Do not remove single x_strum compatibility; do not bind patterns to
        lyric sections; no audio player sync.
    acceptance:
      - Legacy `{x_strum:…}` still parseXStrum; multi schema round-trips N named
        patterns; import/enrich with multi writer keeps Céu Azul 2 patterns;
        docs/HANDOFF-CC-ENRICH-PRODUCAO.md states the multi schema and blast
        radius
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/core/strum-multi.test.ts
        tests/core/import-chordpro.test.ts tests/core/strum.test.ts
      expectExitCode: 0
    outputs:
      - kind: file
        path: src/core/strum.ts
      - kind: file
        path: src/core/import-chordpro.ts
      - kind: file
        path: tests/core/strum-multi.test.ts
      - kind: file
        path: tests/core/import-chordpro.test.ts
      - kind: file
        path: docs/HANDOFF-CC-ENRICH-PRODUCAO.md
  - id: T-002
    title: Vue multi picker (canPick)
    summary: Vue multi picker (canPick)
    weight: 3
    status: done
    lastUpdated: 2026-09-13T23:05:05.978Z
    scopeBoundary:
      - No lyric-section binding; no presets changes beyond reading active
        pattern.
    acceptance:
      - When N>1 patterns, strip canPick works; sheet can
        rename/duplicate/delete/add named patterns; active pattern drives strip
        + editor; warning copy that batida does not auto-follow verse/chorus
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/vue/batida-multi.test.ts
      expectExitCode: 0
    outputs:
      - kind: file
        path: src/vue/StrumStrip.vue
      - kind: file
        path: src/vue/sheets/BatidaSheet.vue
      - kind: file
        path: src/vue/ChordproViewer.vue
      - kind: file
        path: tests/vue/batida-multi.test.ts
parked: []
emerged: []
stack: []
planTitle: Editor de batida — `titan-chordpro-ui`
---

# F2 multi-pattern

