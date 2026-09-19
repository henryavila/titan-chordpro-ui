---
schemaVersion: "0.1"
slug: batida-editor-f3-b3-enrich-conflict-polish
title: B3 Enrich conflict polish
summary: Conflito explícito enrich CC vs batida local.
goal: When user explicitly wants CC batida over local, offer clear Manter /
  Trazer CC (with named copy when multi exists); no silent clobber; polish only
  after B0–B2.
status: done
branch: plan/batida-editor
started: 2026-09-13T23:12:56.998Z
lastUpdated: 2026-09-13T23:12:56.998Z
nextAction: "Start T-001: Explicit CC batida conflict UI"
parentPlan: batida-editor
phaseId: F3
businessIntent:
  value: Conflito explícito Manter/Trazer CC para batida sem clobber silencioso.
  workflow: Default keep-local → UI escolha explícita → replace ou named copy
    quando multi.
  rules: Não inventar batida se strumMissing; keep-local default.
  outOfScope: Audio scrape; fill-empty policy beyond x_strum conflict UX.
  doneWhen: meta-dialog + cifraclub-enrich tests verdes.
tasksDone: 1
tasksTotal: 1
gatesMet: 1
gatesTotal: 1
exitGates:
  - id: F3-G1
    description: Enrich conflict UI/tests green for explicit CC batida replace vs
      keep-local.
    status: met
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/vue/meta-dialog.test.ts
        tests/core/cifraclub-enrich.test.ts
      expectExitCode: 0
    metAt: 2026-09-13T23:12:56.998Z
tasks:
  - id: T-001
    title: Explicit CC batida conflict UI
    summary: Explicit CC batida conflict UI
    weight: 3
    status: done
    lastUpdated: 2026-09-13T23:12:56.998Z
    scopeBoundary:
      - Do not invent batida when strumMissing; do not change fill-empty keys
        policy beyond x_strum conflict UX; no audio scrape.
    acceptance:
      - Default enrich keeps local x_strum; explicit user choice can apply CC
        batida; tests cover keep and replace paths; strumMissing still warns
        without inventing pattern
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/vue/meta-dialog.test.ts
        tests/core/cifraclub-enrich.test.ts
      expectExitCode: 0
    outputs:
      - kind: file
        path: src/vue/edit/MetaDialog.vue
      - kind: file
        path: src/core/import-chordpro.ts
      - kind: file
        path: tests/vue/meta-dialog.test.ts
      - kind: file
        path: tests/core/cifraclub-enrich.test.ts
parked: []
emerged: []
stack: []
---

# F3 enrich conflict

