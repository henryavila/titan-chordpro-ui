# Audit Delivery — versoes-cifra F0

**Date:** 2026-09-25
**Mode:** audit
**Depth:** full
**Axes:** product, residual
**Intent sources:** phase F0 businessIntent, operator block contract, `.atomic-skills/reviews/decision-package-versoes-cifra-F0.md`
**Verdict:** PARTIAL

## Intent Package

### Decisions

| ID | Decision | Why |
|----|----------|-----|
| D1 | Par completo no topo; texto fora é erro | Várias cifras no mesmo arquivo sem misturar preâmbulo |
| D2 | Sem par completo, o arquivo inteiro é uma cifra | Fixtures SDA e cifra antiga continuam válidas |
| D3 | Cifra que abre é a do marcador próprio, senão a primeira | Um default, fora de tab/partitura |
| D4 | Gravação nomeia uma cifra e só os campos pedidos | Sem header compartilhado em N>1 |
| D5 | Cerca de cifra sempre delimita; uma chave de cache, uma resposta | Tablatura aberta não esconde a cifra seguinte |
| D6 | Tab/partitura é notação, não crédito | Writer não iça title/artist/áudio |
| D7 | ChartEnvelopeError vira cópia em português no viewer | O computed não estoura |
| D8 | Duração compara segundos | Máscara de 4 dígitos não reescreve texto intocado nem hora buscada |
| D9 | replaceChart tira um par só se o início vem antes do fim | Irmã engolida pelo cache não some |
| D10 | Core sem Vue | Contrato do pacote |

### Original problems

| ID | Problem | Expected fix shape |
|----|---------|-------------------|
| P1 | Várias cifras no mesmo arquivo eram concatenadas ou last-write de tom/duração | listCharts e parse fatiado, erro quando o contrato quebra |

### Acceptance / doneWhen

| ID | Criterion | Source |
|----|-----------|--------|
| A1 | tests/core/charts-envelope.test.ts verde (104) | F0-G1, exit 0 em a6110eb |
| A2 | SDA e no-vue verdes (5) | F0-G2, exit 0 em a6110eb |

### Vocabulary delta

| OLD | NEW | Scope |
|-----|-----|-------|
| versão (cifra dentro do arquivo) | cifra | cópia de produto |
| header compartilhado em N>1 | pares completos; texto fora é erro | leitor e writer |

### Surface inventory

| Surface | Path / system | Role |
|---------|---------------|------|
| envelope | src/core/charts.ts | list, split, write, replace |
| parse | src/core/parse.ts | fatia com o mesmo closer |
| duração | src/core/timeline.ts, src/vue/edit/MetaDialog.vue | segundos |
| viewer | src/vue/ChordproViewer.vue | erro em português |
| testes | tests/core/charts-envelope.test.ts | contrato |

### Non-goals / do-not-reopen

- Chip no título, CRUD no editor, overlay por cifra, export e docs VISAO/SPEC/NAMING (F1–F4).
- design.md ainda descreve header compartilhado. O contrato do operador substitui essas decisões. Docs ficam na F4.

### Key SSOT paths

- src/core/charts.ts
- src/core/parse.ts
- src/vue/ChordproViewer.vue
- src/vue/edit/MetaDialog.vue

## Spec Package

D1–D10 acima. Cadeia: arquivo → splitCho/listCharts → parse(chartId) → write/replace no bloco → viewer captura ChartEnvelopeError. Fora: chip, overlay, export, docs.

## Matrix A — Decisions

| ID | Decision | Expected chain | S | C | U | O | T | X | Status | Evidence |
|----|----------|----------------|---|---|---|---|---|---|--------|----------|
| D1 | texto fora é erro | split → throw | ok | ok | ok | ok | ok | ok | RESOLVED | src/core/charts.ts:316-327 |
| D2 | sem par = texto inteiro | split → um chart | ok | ok | ok | ok | ok | ok | RESOLVED | src/core/charts.ts:313-337 |
| D3 | default próprio | marcador fora de notação | ok | ok | ok | ok | ok | ok | RESOLVED | src/core/charts.ts:223-235 |
| D4 | patch de uma cifra | write sem header | ok | ok | ok | ok | ok | ok | RESOLVED | src/core/charts.ts:1050-1093 |
| D5 | cerca delimita | cache único | ok | ok | ok | ok | ok | ok | RESOLVED | src/core/charts.ts:628-645 |
| D6 | notação não é crédito | máscara + setAudioUrl | ok | ok | ok | ok | ok | ok | RESOLVED | src/core/charts.ts:168-185 |
| D7 | erro em português | viewer computed | ok | ok | partial | ok | ok | ok | PARTIAL | src/vue/ChordproViewer.vue:436-444 |
| D8 | segundos | songDurationSec | ok | ok | ok | ok | ok | ok | RESOLVED | src/core/timeline.ts:125-132 |
| D9 | um par, início antes do fim | replaceChart | ok | ok | ok | ok | ok | ok | RESOLVED | src/core/charts.ts:1282-1315 |
| D10 | sem Vue no core | import | ok | ok | ok | ok | ok | ok | RESOLVED | src/core/index.ts |

## Matrix B — Problems

| ID | Problem | Expected fix shape | S | C | U | O | T | X | Status | Evidence |
|----|---------|-------------------|---|---|---|---|---|---|--------|----------|
| P1 | corpos concatenados | parse fatiado | ok | ok | ok | ok | ok | ok | RESOLVED | tests/core/charts-envelope.test.ts |

## Matrix C — must-not

| ID | Must NOT | Seed | Status | Evidence |
|----|----------|------|--------|----------|
| C1 | header compartilhado em N>1 | operador | RESOLVED | src/core/import-chordpro.ts:431-453 |
| C2 | içar title de dentro da tab | operador | RESOLVED | src/core/charts.ts:974-976 |
| C3 | Vue em src/core | AGENTS | RESOLVED | tests/core/no-vue-in-core.test.ts |

## Findings Ledger

| # | Title | Sev | Axis | Evidence | Impact | Suggested fix (one-liner) |
|---|-------|-----|------|----------|--------|---------------------------|
| 1 | MetaDialog lê o arquivo sem captura | MEDIUM | product | src/vue/edit/MetaDialog.vue:50 | Abrir meta num arquivo já inválido estoura, o computed do viewer não | Capturar ChartEnvelopeError no setup do diálogo |
| 2 | Docs ainda ensinam multicifra só do host | HIGH | residual | docs/VISAO.md:51 | A F4 é quem reescreve VISAO/SPEC/NAMING | Deixar para F4-G2 |
| 3 | design.md ainda manda header compartilhado | MEDIUM | residual | projects/titan-chordpro-ui/versoes-cifra/design.md:66 | O código segue o contrato de blocos | Não reabrir o leitor; o brief da fase seguinte cita o contrato do operador |

## Residual

| # | Title | Sev | Class | Evidence | Status |
|---|-------|-----|-------|----------|--------|
| 1 | VISAO/SPEC/NAMING/README ensinam seleção só do host e “versão” | HIGH | teaching | docs/VISAO.md:51, SPEC.md:28, SPEC.md:86, docs/NAMING.md:52 | deferred to F4 |
| 2 | Comentário SONG_META_KEYS fala em header acima do envelope | LOW | teaching | src/core/charts.ts:25 | comment only; N>1 write does not hoist |
| 3 | design.md Decisions 2, 4, 5, 14 | MEDIUM | teaching | design.md:56, design.md:66, design.md:93 | operator contract overrides |

### Residual protocol

- Terms: OLD=versão/header compartilhado/new_song/VisualAdapter/BEATS_PER_ROW como duração de verso; NEW=cifra e pares de bloco
- Validity: valid
- Surfaces hunted: src/core, src/vue, tests, docs/VISAO.md, docs/NAMING.md, SPEC.md, README.md

Não há içamento de meta em N>1, nem `{new_song}` aceito, nem VisualAdapter, nem BEATS_PER_ROW como tempo de verso, nem strip de `x///` na fonte.

## Accept Register

| Finding | Risk | Mitigation | Operator | At | Expires |
|---------|------|------------|----------|-----|---------|
| Docs desatualizados | músico lê o contrato velho | F4-G2 é o gate desses arquivos | fase F4, fora do doneWhen do F0 | 2026-09-25 | F4 close |

## Self-review

- G1: linhas citadas foram lidas no viewer, no MetaDialog e nos relatórios dos auditores.
- G2: veredito é PARTIAL, não CLOSED.
- G6: cada linha de matriz aponta arquivo.
