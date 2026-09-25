---
schemaVersion: "0.1"
slug: versoes-cifra-f1-overlay-e-sugestao-por-cifra
title: Overlay e sugestão por cifra
summary: Overlay e sugestão passam a ser por música+cifra, não pelo arquivo inteiro.
goal: "overlay key is cpv:my:{songId}:{chartId}; legacy cpv:my:{songId} reads as chart default; Suggestion carries chartId; TextOp.at is against the chart document; accept splices via replaceChart and save-content emits the whole file."
status: active
branch: plan/versoes-cifra
started: 2026-09-25T03:35:00.000Z
startedCommit: e8fc929c5344cd011b9234aa5cf13ab39dbd4ab3
lastUpdated: 2026-09-25T03:35:00.000Z
nextAction: "Spawn the F1 code-only writer on a sibling worktree. Do not edit product source on the plan branch."
parentPlan: versoes-cifra
phaseId: F1
businessIntent:
  value: O músico guarda afinação, overlay e sugestão na cifra que está aberta,
    e a chave antiga do arquivo continua valendo para a cifra default.
  workflow: overlayKey passa a incluir o chartId. A chave legada cpv:my:{songId}
    é lida como a cifra default e a gravação seguinte usa
    cpv:my:{songId}:default. Suggestion carrega chartId. acceptOp chama
    replaceChart e save-content devolve o arquivo inteiro, com as cifras irmãs.
  rules: Não criar o chip de título. Não criar CRUD de cifra. Não mudar o
    uniquify da setlist. Não emitir save-content só da cifra visível. Não
    postar sugestão para um host. Identidade dentro de tab ou partitura
    continua notação.
  outOfScope: Chip no título, escrita de cifras no editor, export por arquivo
    ou por cifra, e a reescrita de VISAO, SPEC e NAMING. Isso fica nas fases
    F2, F3 e F4.
  doneWhen: tests/core/overlay.test.ts, tests/vue/storage-seam.test.ts e
    tests/vue/overlay-ui.test.ts verdes, com a chave por cifra e o save
    devolvendo o arquivo inteiro.
tasksDone: 0
tasksTotal: 2
gatesMet: 0
gatesTotal: 1
weightDone: 0
weightTotal: 6
exitGates:
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
stack:
  - id: 1
    title: Overlay e sugestão por cifra
    type: task
    openedAt: 2026-09-25T03:35:00.000Z
tasks:
  - id: T-001
    title: overlayKey and legacy migrate
    summary: Chave de overlay por música e cifra, com leitura da chave antiga na cifra default.
    weight: 3
    status: pending
    lastUpdated: 2026-09-25T03:35:00.000Z
    scopeBoundary:
      - Do not build the title chip; do not add chart CRUD in the editor; do not change setlist id uniquify.
    acceptance:
      - overlayKey("jesus-1", "oferta") is cpv:my:jesus-1:oferta; overlayKey("jesus-1") and overlayKey("jesus-1", "default") share the default slot; a stored cpv:my:jesus-1 value loads for chart default and the next write uses cpv:my:jesus-1:default; TuneOp still stores on that overlay
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/core/overlay.test.ts tests/vue/storage-seam.test.ts
      expectExitCode: 0
    outputs:
      - kind: file
        path: src/core/storage.ts
      - kind: file
        path: src/vue/use/useOverlay.ts
      - kind: file
        path: tests/core/overlay.test.ts
      - kind: file
        path: tests/vue/storage-seam.test.ts
  - id: T-002
    title: Suggestion.chartId and accept splice
    summary: Sugestão carrega chartId e o aceite grava o arquivo inteiro via replaceChart.
    weight: 3
    status: pending
    lastUpdated: 2026-09-25T03:35:00.000Z
    scopeBoundary:
      - Do not POST to a host; do not change persistSuggestion ack contract; do not emit save-content of only the visible chart.
    acceptance:
      - created Suggestion includes chartId of the active chart; diffOps runs on the chart document from parse; acceptOp calls replaceChart then save-content with the full file string containing siblings; queue grouping key is songId plus chartId so the reviewer label is title plus chart label
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/vue/overlay-ui.test.ts
      expectExitCode: 0
    outputs:
      - kind: file
        path: src/core/overlay.ts
      - kind: file
        path: src/vue/use/useOverlay.ts
      - kind: file
        path: src/vue/public.ts
      - kind: file
        path: tests/vue/overlay-ui.test.ts
parked: []
emerged: []
---

# Overlay e sugestão por cifra

## Session handoff

F1 acabou de materializar. O operador fechou o F0 e mandou continuar. A espinha acima é a do descritor e do sidecar, ratificada por essa frase.

- **Narrative:** F1 ativa no plano versoes-cifra. Nenhuma tarefa começou. O writer ainda não existe.
- **Decision log:** Sem header compartilhado em N>1. Overlay é por songId e chartId. save-content devolve o arquivo inteiro.
- **Single nextAction:** Spawn the F1 code-only writer on a sibling worktree.
- **Verbatim state:** startedCommit `e8fc929c5344cd011b9234aa5cf13ab39dbd4ab3`. Sidecar `phases/f1-overlay-e-sugestao-por-cifra.source.json`.
- **Uncommitted changes:** clean tree expected after the materialize commit.

## Links

- Plan: `.atomic-skills/projects/titan-chordpro-ui/versoes-cifra/plan.md`
- Lessons: `.atomic-skills/projects/titan-chordpro-ui/versoes-cifra/lessons/versoes-cifra-f0-leitor-envelope-e-parse-fatiado.md`
