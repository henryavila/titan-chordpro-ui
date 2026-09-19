---
schemaVersion: "0.1"
slug: batida-editor-f1-b1-presets-embutidos
title: B1 Presets embutidos
summary: Catálogo de presets embutidos aplicados na folha Batida.
goal: Core catalog of named strum presets apply into the single `{x_strum:}`
  pattern from the Batida sheet with confirm-if-dirty; IDs stable; tests green.
status: done
branch: plan/batida-editor
started: 2026-09-13T22:59:50.372Z
lastUpdated: 2026-09-13T22:59:50.372Z
nextAction: "Start T-001: Core preset catalog"
parentPlan: batida-editor
phaseId: F1
businessIntent:
  value: Catálogo de presets embutidos aplicados na folha Batida sem storage do host.
  workflow: Core listStrumPresets → Vue seção Presets com confirm-if-dirty → save
    single x_strum.
  rules: IDs estáveis; formatXStrum/parseXStrum; sem multi-pattern; sem localStorage.
  outOfScope: Multi-pattern (F2); conflict enrich UI (F3); user-saved presets.
  doneWhen: strum-presets + batida-presets tests verdes.
tasksDone: 2
tasksTotal: 2
gatesMet: 1
gatesTotal: 1
exitGates:
  - id: F1-G1
    description: Preset catalog + Vue apply tests green.
    status: met
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/core/strum-presets.test.ts
        tests/vue/batida-presets.test.ts
      expectExitCode: 0
    metAt: 2026-09-13T22:59:50.372Z
tasks:
  - id: T-001
    title: Core preset catalog
    summary: Core preset catalog
    weight: 2
    status: done
    lastUpdated: 2026-09-13T22:59:50.372Z
    scopeBoundary:
      - No user-saved presets storage; no multi-pattern wire; no Vue beyond
        export surface.
    acceptance:
      - listStrumPresets returns stable ids and patterns that
        formatXStrum/parseXStrum round-trip; at least three presets; applying a
        preset replaces slots/grid/label fields without inventing new token
        alphabet
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/core/strum-presets.test.ts
      expectExitCode: 0
    outputs:
      - kind: file
        path: src/core/strum-presets.ts
      - kind: file
        path: src/core/index.ts
      - kind: file
        path: tests/core/strum-presets.test.ts
  - id: T-002
    title: Vue presets section on Batida sheet
    summary: Vue presets section on Batida sheet
    weight: 2
    status: done
    lastUpdated: 2026-09-13T22:59:50.372Z
    scopeBoundary:
      - Do not add host localStorage preset sync; do not implement multi-pattern
        picker here.
    acceptance:
      - Batida sheet shows presets when capability/flag allows; applying a
        preset updates draft and asks confirm if draft dirty; save still writes
        single x_strum
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/vue/batida-presets.test.ts
      expectExitCode: 0
    outputs:
      - kind: file
        path: src/vue/sheets/BatidaSheet.vue
      - kind: file
        path: src/vue/edit/BatidaPresets.vue
      - kind: file
        path: tests/vue/batida-presets.test.ts
parked: []
emerged: []
stack: []
---

# Narrative / notes

Initiative for phase **F1 — B1 Presets embutidos**.

Execution order: T-001 → T-002.
