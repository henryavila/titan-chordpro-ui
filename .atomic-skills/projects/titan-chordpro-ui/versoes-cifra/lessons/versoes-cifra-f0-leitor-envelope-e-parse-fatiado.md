---
schemaVersion: "0.2"
slug: versoes-cifra-f0-leitor-envelope-e-parse-fatiado
projectId: titan-chordpro-ui
parentPlan: versoes-cifra
lessons:
  - id: L-001
    statement: Uma chave de cache do closer de tablatura/partitura guardou duas respostas diferentes e a cifra do meio sumiu.
    corrective: "Em src/core/charts.ts, fence-stop de root e de frame aninhado grava o mesmo sentinela. Uma chave tem uma resposta. Não publique boundary na chave que o root usa como parada."
    scope: reusable
    appliesTo: []
    status: open
    confidence: 2
    createdAt: 2026-09-25T03:12:00.000Z
    validatedAt: 2026-09-25T03:12:00.000Z
    evidence: .atomic-skills/reviews/2026-09-24-fix28-both.md
  - id: L-002
    statement: Um closer de tablatura ou partitura depois da cerca da próxima cifra cobriu a cifra do meio.
    corrective: "O closer só vale antes da próxima cerca real de cifra. Tablatura aberta não esconde a cifra seguinte. Cerca dentro de bloco que fecha antes dessa cerca continua notação."
    scope: reusable
    appliesTo: []
    status: open
    confidence: 2
    createdAt: 2026-09-25T03:12:00.000Z
    validatedAt: 2026-09-25T03:12:00.000Z
    evidence: .atomic-skills/reviews/2026-09-24-fix27-both.md
  - id: L-003
    statement: Diretivas de identidade dentro de tablatura ou partitura foram lidas como créditos da música e o writer as içou para fora do bloco.
    corrective: "Linhas dentro de tab/score são notação. readMeta, parse e os writers não as tratam como title, artist, áudio ou cifra padrão, e não as apagam."
    scope: reusable
    appliesTo: []
    status: open
    confidence: 2
    createdAt: 2026-09-25T03:12:00.000Z
    validatedAt: 2026-09-25T03:12:00.000Z
    evidence: .atomic-skills/reviews/2026-09-24-fix22-both.md
  - id: L-004
    statement: A máscara de quatro dígitos igualou durações com segundos diferentes e reescreveu texto que o músico não editou.
    corrective: "Igualdade é songDurationSec. Blur que só reformata não marca duração tocada. 4m26s intocado permanece byte a byte. Valor buscado usa formatDurationFromSec, não normalizeDurationMmSs."
    scope: reusable
    appliesTo: []
    status: open
    confidence: 2
    createdAt: 2026-09-25T03:12:00.000Z
    validatedAt: 2026-09-25T03:12:00.000Z
    evidence: src/vue/edit/MetaDialog.vue
  - id: L-005
    statement: O header compartilhado entre cifras N>1 reescreveu irmãs e dobrou o texto de fora para dentro do bloco.
    corrective: "Com pelo menos um par completo, o topo do arquivo são só os pares. Texto fora é ChartEnvelopeError. Arquivo sem par completo continua uma cifra, o texto inteiro. Não voltar a inferir header compartilhado."
    scope: reusable
    appliesTo: []
    status: open
    confidence: 2
    createdAt: 2026-09-25T03:12:00.000Z
    validatedAt: 2026-09-25T03:12:00.000Z
    evidence: .atomic-skills/reviews/2026-09-24-versoes-cifra-f0-blocks-both.md
---

# Lições F0 — leitor de envelope

Ratificadas pelo operador em 2026-09-25 com a frase "feche f0 e continue sem esperar", sobre o conjunto destilado dos findings já corrigidos no ciclo fix21–fix28. Nenhuma lição ficou de fora.
