# Audit Delivery — versoes-cifra F1

**Date:** 2026-09-25
**Mode:** audit
**Depth:** light
**Axes:** product, residual
**Intent sources:** F1 businessIntent, decisions/F1.jsonl, eval-versoes-cifra-F1.md
**Verdict:** PARTIAL

## Intent Package

### Decisions

| ID | Decision | Why |
|----|----------|-----|
| D1 | Overlay `cpv:my:{songId}:{chartId}` | Identidade tripla; Minha versão por cifra |
| D2 | Legacy `cpv:my:{songId}` lê default e grava `:default` | Arquivo de 1 cifra não perde overlay |
| D3 | Suggestion.chartId; ops no documento da cifra | `at` não desloca a irmã |
| D4 | accept = replaceChart; save-content = arquivo inteiro | Publicar Oferta não apaga Completa |
| D5 | Publicação é splice, não reset do arquivo | Rascunho da irmã sobrevive |
| D6 | Cifra aberta sincroniza inteira | Tom, letra e Minha versão da cifra na tela |
| D7 | Capo de arquivo é da cifra aberta | Irmã com `{capo:}` não vaza |
| D8 | TuneOp não é conflito de letra | Diálogo de versão oficial não zera o tom |

### Original problems

| ID | Problem | Expected fix shape |
|----|---------|-------------------|
| P1 | Overlay e sugestão eram do arquivo inteiro | Chave e ops por chartId |

### Acceptance / doneWhen

| ID | Criterion | Source |
|----|-----------|--------|
| A1 | overlay + overlay-ui + storage-seam verdes (92) | F1-G1, exit 0 em 01904a2 |

### Vocabulary delta

| OLD | NEW | Scope |
|-----|-----|-------|
| overlay por música | overlay por música+cifra | storage, useOverlay |
| aceite reseta o arquivo | aceite faz splice da cifra | session.spliceChart |

### Surface inventory

| Surface | Path | Role |
|---------|------|------|
| overlay key | src/core/storage.ts | cpv:my:{song}:{chart} |
| suggestion accept | src/vue/use/useOverlay.ts | publishChart |
| viewer paint | src/vue/ChordproViewer.vue | syncOpenChart |
| tests | tests/vue/overlay-ui.test.ts | 52 tests |

`single-surface: false`. Vocabulary: additive overlay key suffix.

## Matrix

| ID | Status | Evidence |
|----|--------|----------|
| D1 | RESOLVED | overlayKey tests; storage-seam two-chart key `cpv:my:uma:oferta` |
| D2 | RESOLVED | storage-seam legacy load then write `:default` |
| D3 | RESOLVED | overlay-ui stamps chartId; titleOp.at on chart document |
| D4 | RESOLVED | accept save-content contains both start_of_x_chart blocks |
| D5 | RESOLVED | overlay-ui keeps oferta rascunho when accepting completa |
| D6 | RESOLVED | overlay-ui paints completa (meu) while oferta rascunho stays |
| D7 | RESOLVED | overlay-ui: oferta capo 3, open completa → not capo 3 |
| D8 | RESOLVED | overlay-ui: dialog open, display key stays A |
| P1 | RESOLVED | F1-G1 92 tests exit 0 |
| A1 | RESOLVED | same |

## Residual

| Term | Surface | Class | Status |
|------|---------|-------|--------|
| `:` / `%` in songId | overlayKey | encoding | PARTIAL — deferred in F1.jsonl |
| F2 chip on same branch | CpvViewHead | extra | N/A for F1 (outOfScope) |

Colon/% collision is an accepted residual. No CRITICAL.

## Verdict

**PARTIAL** — F1 overlay/suggestion delivered. Residual: songId with `:` or `%` collides with the key format (deferred). F2–F4 extra product is out of F1 intent.
