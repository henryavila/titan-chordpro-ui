---
id: chrome-botoes
status: in-progress
audiences: [musician, host, agent]
exports: []
dom:
  - "[data-scroll]"
  - "[data-fit]"
  - "[data-edit]"
  - "[data-lens=nashville]"
  - "[data-comments-toggle]"
  - "[data-met-btn]"
  - "[data-more]"
tests:
  - tests/vue/dock-play.test.ts
  - tests/vue/icons.test.ts
  - tests/vue/lens-letra.test.ts
---

# Chrome — botões da cifra

Peças em `src/vue/ui/`: RollButton, TypePair, BarButton, IconButton.

O músico vê Rolar, A−/A+, Ajuste, Graus, Comentários, Metrônomo, Editar e Mais. Telefone 44px, computador 36px, mesma cor e o mesmo `data-*`.
