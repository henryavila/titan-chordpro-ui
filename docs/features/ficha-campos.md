---
id: ficha-campos
status: stable
audiences: [musician, agent]
exports: []
dom:
  - "[data-meta-title]"
  - "[data-meta-duration]"
  - "[data-meta-time]"
  - "[data-nova-title]"
  - "[data-nova-duration]"
  - "[data-time-chip]"
  - "[data-key-chip]"
tests:
  - tests/vue/meta-dialog.test.ts
  - tests/vue/new-chart.test.ts
---

# Ficha — campos da cifra

Meta e Nova cifra usam a mesma ficha: nome, duração, andamento, compasso e tom.

O compasso ligado fica com a classe `is-on` (fundo `--chord`). O ± do andamento é o Stepper `sm`. Gravar a cifra é o botão `chord`; aceitar uma sugestão é o botão `pill`.
