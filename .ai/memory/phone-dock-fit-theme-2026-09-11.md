# Dock do telefone — Ajuste vs Tema (2026-09-11)

## Decisão

No telefone:

- **Ajuste ao espaço** (`data-fit`, ícone `scan`) fica no **dock**, à direita de Editar, antes de Mais.
- **Tema** fica em **Mais** (`data-theme-btn`); o clique cicla e **não** fecha a folha.

Desktop wide bar: Ajuste e Tema continuam na barra.

## Armadilha

O commit `4a739ea` descreveu esse layout e atualizou os testes, mas o Vue ficou invertido (Tema no dock, Ajuste em Mais). Os 3 fails em `tests/vue/icons.test.ts` apontavam o bug — corrigir a UI, não os testes.

SoT nos testes: `tests/vue/icons.test.ts` + comentários em `tests/browser/layout.spec.ts`.
