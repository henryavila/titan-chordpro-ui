---
schemaVersion: "0.2"
slug: versoes-cifra-f1-overlay-e-sugestao-por-cifra
projectId: titan-chordpro-ui
parentPlan: versoes-cifra
lessons:
  - id: L-001
    statement: Aceitar uma sugestão da cifra A resetava o arquivo inteiro e apagava o rascunho da cifra B.
    corrective: "Publicação é splice por cifra. session.spliceChart atualiza um bloco no working e no committed. save-content é o arquivo oficial sem o rascunho da irmã. Não chamar session.reset porque uma irmã virou oficial."
    scope: reusable
    appliesTo: []
    status: open
    confidence: 2
    createdAt: 2026-09-25T21:20:00.000Z
    validatedAt: 2026-09-25T21:20:00.000Z
    evidence: src/vue/use/useOverlay.ts
  - id: L-002
    statement: Um rascunho não salvo de outra cifra era usado para não pintar a cifra aberta.
    corrective: "Ao abrir uma cifra, sincronizar essa cifra (oficial + Minha versão + tom) via spliceChart. session.dirty() do arquivo não é trava. chartDirty só da cifra aberta."
    scope: reusable
    appliesTo: []
    status: open
    confidence: 2
    createdAt: 2026-09-25T21:20:00.000Z
    validatedAt: 2026-09-25T21:20:00.000Z
    evidence: src/vue/ChordproViewer.vue
  - id: L-003
    statement: Sem TuneOp, o capo lia o primeiro {capo:} do envelope ou o default do arquivo.
    corrective: "preloadTune lê openChartDocument / screenChartId. Cifra sem {capo:} é capo 0. Irmã com capo não vaza."
    scope: reusable
    appliesTo: []
    status: open
    confidence: 2
    createdAt: 2026-09-25T21:20:00.000Z
    validatedAt: 2026-09-25T21:20:00.000Z
    evidence: src/vue/ChordproViewer.vue
  - id: L-004
    statement: O diálogo de letra oficial mudou fazia load() devolver null e apagava o tom fixo na tela.
    corrective: "load() devolve o TuneOp mesmo com updDlg. Manter chama onChartLoad com o tom restante. Adotar chama onChartLoad(null)."
    scope: reusable
    appliesTo: []
    status: open
    confidence: 2
    createdAt: 2026-09-25T21:20:00.000Z
    validatedAt: 2026-09-25T21:20:00.000Z
    evidence: src/vue/use/useOverlay.ts
---
