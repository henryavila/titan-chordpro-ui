---
schemaVersion: "0.1"
slug: editor-f0-scaffold-e0-view-edit-source-pane-meta
title: Scaffold + E0 (view↔edit, source pane, meta)
summary: Scaffold do pacote + modo view/edit com source pane, meta e bridge dirty.
goal: Greenfield package boots with `view`|`edit`, source pane + preview sync,
  editable meta, host dirty/`onSourceChange`, transpose reset on enter edit;
  SPEC/VISAO/handoff aligned for editor E0.
status: active
branch: plan/editor
started: 2026-08-29T11:08:20.266Z
lastUpdated: 2026-08-29T11:08:20.266Z
nextAction: "Start T-001: Align product SoT docs for editor E0"
parentPlan: editor
phaseId: F0
businessIntent:
  value: UI ChordPro view+edit com Source-SoT e bridge SDA (sda-v2 primeiro).
  workflow: Alinhar docs SoT → scaffold core/Vue sem Vue em core → E0 source pane
    + meta + dirty + reset transpose ao entrar em edit.
  rules: Source ChordPro é SoT; ViewModel só leitura; fit/reflow e transpose off
    no edit; fixtures reais; host recebe string/dirty/media não HTML.
  outOfScope: E1–E4 (fases seguintes); collab; shell titan-chordpro; multicifra;
    player sync; fretboard; VM↔serialize como caminho feliz.
  doneWhen: SPEC com aceite E0; vitest e0-source-session e e0-bridge verdes; zero
    imports Vue em src/core.
tasksDone: 0
tasksTotal: 3
gatesMet: 0
gatesTotal: 2
exitGates:
  - id: F0-G1
    description: E0 vitest files green (mode, meta, source round-trip, dirty,
      transpose reset).
    status: pending
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/core/e0-source-session.test.ts
        tests/vue/e0-bridge.test.ts
      expectExitCode: 0
  - id: F0-G2
    description: No Vue imports in src/core.
    status: pending
    verifier:
      kind: shell
      command: "! rg -n \"from ['\\\"]vue['\\\"]\" src/core"
      expectExitCode: 0
stack:
  - id: 1
    title: Scaffold + E0 (view↔edit, source pane, meta)
    type: task
    openedAt: 2026-08-29T11:08:20.266Z
tasks:
  - id: T-001
    title: Align product SoT docs for editor E0
    summary: "Alinhar VISAO/SPEC/handoff/AGENTS ao editor E0."
    weight: 1
    status: pending
    lastUpdated: 2026-08-29T11:08:20.266Z
    scopeBoundary:
      - Do not implement src/; do not change fixtures/; do not invent npm
        package names beyond naming lock.
    acceptance:
      - SPEC.md names E0 acceptance; design-handoff/01-screens.md separates view
        vs edit; AGENTS.md points at editor design; SPEC no longer marks
        ChordPro editor as Future non-goal for E0 path
    verifier:
      kind: shell
      command: rg -n 'E0|Source-SoT|edit surface' SPEC.md design-handoff/01-screens.md
        AGENTS.md docs/VISAO.md
      expectExitCode: 0
    outputs:
      - kind: file
        path: docs/VISAO.md
      - kind: file
        path: SPEC.md
      - kind: file
        path: design-handoff/01-screens.md
      - kind: file
        path: AGENTS.md
  - id: T-002
    title: Scaffold core + Vue package entries
    summary: "Criar scaffold core+Vue com testes e isolamento sem Vue no core."
    weight: 3
    status: pending
    lastUpdated: 2026-08-29T11:08:20.266Z
    scopeBoundary:
      - No in-place chord mapper yet; no TAB editor; no image directive; no
        React/CE binding; no monorepo merge with gen.
    acceptance:
      - pnpm test runs; src/core/index.ts exports without Vue;
        ChordproViewer.vue accepts mode view|edit; rg finds no vue import under
        src/core
    verifier:
      kind: shell
      command: pnpm test && test -f src/core/index.ts && test -f
        src/vue/ChordproViewer.vue && ! rg -n "from ['\"]vue['\"]" src/core
      expectExitCode: 0
    outputs:
      - kind: file
        path: package.json
      - kind: file
        path: pnpm-workspace.yaml
      - kind: file
        path: tsconfig.json
      - kind: file
        path: vitest.config.ts
      - kind: file
        path: src/core/index.ts
      - kind: file
        path: src/vue/index.ts
      - kind: file
        path: src/vue/ChordproViewer.vue
      - kind: file
        path: README.md
  - id: T-003
    title: E0 source pane + meta + host bridge
    summary: "Implementar source-session, meta, SourcePane e bridge dirty/transpose-reset."
    weight: 5
    status: pending
    lastUpdated: 2026-08-29T11:08:20.266Z
    scopeBoundary:
      - No WYSIWYG structural commands; no in-place lyric/chord DOM mapping; no
        image directive; no fit-mode editing.
    acceptance:
      - e0-source-session.test.ts proves transpose reset on enter edit and meta
        writes into source; e0-bridge.test.ts proves SourcePane onSourceChange
        and dirty; fit not used as edit layout truth
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/core/e0-source-session.test.ts
        tests/vue/e0-bridge.test.ts
      expectExitCode: 0
    outputs:
      - kind: file
        path: src/core/controller.ts
      - kind: file
        path: src/core/edit/source-session.ts
      - kind: file
        path: src/vue/ChordproViewer.vue
      - kind: file
        path: src/vue/edit/SourcePane.vue
      - kind: file
        path: src/vue/edit/MetaFields.vue
      - kind: file
        path: tests/core/e0-source-session.test.ts
      - kind: file
        path: tests/vue/e0-bridge.test.ts
parked: []
emerged: []
---

# Narrative / notes

Initiative for phase **F0 — Scaffold + E0 (view↔edit, source pane, meta)**.

## Decisions

_(record decisions here as they are made)_

## Links

_(plan doc, external refs)_
