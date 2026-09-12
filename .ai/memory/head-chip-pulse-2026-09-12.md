# Pulso da faixa + `.cpv-head-chip` (2026-09-12)

O tempo 1 pinta a barra do título de tinta (`--downbeat`). Remapear `--chord` / `--muted` / `--chord-edge` **na faixa** faz a pílula do tom, o kicker “Tom” e o traço +|Capo virarem a mesma cor da superfície — ilegível, e os botões colam.

**Contrato:** fill próprio na barra (tom, capo, índice da lista, chip futuro) leva `cpv-head-chip`. O invert do 1 é só `.cpv-head-hit-1 .cpv-head-chip`. Título / subtítulo / meta / ghost herdam a faixa.

**Gate:** `tests/vue/head-chip.test.ts` recusa fundo pintado, `var(--chord…)` ou cor literal fora do chip. Não voltar a whitelist de widgets (`.cpv-keypill`, `[data-tone]`) no CSS do hit-1.

Tokens, não hex. SoT visual: `design-source/metronome-pulse-preview.html`.
