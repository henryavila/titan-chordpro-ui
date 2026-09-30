# Design — Pulsação dos tempos do compasso

> **Aprovado** (usuário, 2026-09-29) · abordagem **A**
> Título 50/50 (tempo + contratempo) · coluna = identidade do pulso

## Problema

Dois pulsos do metrônomo no ensaio: a **coluna 1–2–3–4** à esquerda da cifra e a **faixa do título** (opt-in “Faixa do título”).

Hoje só o tempo 1 é legível.

- **Coluna:** o 1 pinta de verde (`--chord`); 2–4 pulsam com `--beat-rest` (chip branco/cinza) e somem no tema. Ociosos são só número, sem caixa.
- **Título:** o 1 **inverte a faixa o pulso inteiro** (`cpv-head-hit-1` é classe estática). 2–4 são um fade de `--chord-fill` (`cpv-head-n`) — lavagem verde a 17%, difícil de ver. O 1 só some quando chega o 2, então o ataque parece atrasado.

## Decisão

Abordagem **A**, com duty cycle de **meio pulso** na faixa (pedido do músico: marcar tempo e contratempo).

| Superfície | Papel | Duração | Cor no ataque |
|---|---|---|---|
| Coluna 1–2–3–4 | *Qual* tempo | Pulso inteiro (`is-now`) | **1** preto/branco do tema (`--downbeat` / `--downbeat-ink`); **2–4** cor do tema (`--chord` / `--chord-ink`) |
| Faixa do título | *Quando* (tempo / contratempo) | Acesa na 1ª metade, apagada na 2ª | Mesma língua: **1** inverte com `--downbeat`; **2–4** pintam com `--chord`, pulso quadrado (sem fade) |
| Pontos do painel | Eco da coluna | Enquanto aquele tempo é o atual | Mesmas cores da coluna |

Rolar sem “Faixa do título” **não** pinta a barra. A coluna segue.

## Relógio

Fonte: `beatClock` (float, já atualizado a cada frame em `useMetronome`).

- Fração `< 0,5` → ataque (tempo).
- Fração `≥ 0,5` → descanso (contratempo).
- `beat === 0` → `'1'`; senão `'n'`.
- Parado → `''`.

A faixa e o flash dos acordes da cifra leem essa função. A classe some na metade: o próximo ataque reaplica e o CSS dos acordes dispara de novo, sem o `nextTick` que zera e recoloca `metHit`.

Mudar o BPM no meio do ensaio acompanha o pulso atual — a fração vem do loop, não de um `setTimeout` com o intervalo antigo.

`--cpv-met-hit` (`30000/bpm` ms, meio pulso) continua só para a animação dos **acordes** da cifra.

## CSS

### Coluna

`.cpv-met-beat.is-now` → `--chord` / `--chord-ink`.  
`.cpv-met-beat.is-now.is-one` → `--downbeat` / `--downbeat-ink`.  
Ocioso: transparente, sem borda (como hoje).

`--beat-rest` / `--beat-rest-ink` **não** saem do tema: o piano ainda usa. A pulsação não usa mais.

### Faixa

`cpv-head-hit-1` permanece o invert com `--downbeat` (não remapeia `--chord` na faixa; chips via `.cpv-head-chip`). A classe **sai** na metade do pulso — deixa de ser um estado do 1 inteiro.

`cpv-head-hit-n` deixa de ser `@keyframes cpv-head-n`. Vira pintura estática, espelho do 1 com `--chord` / `--chord-ink`:

- Faixa: `--veil` / `--text` a partir de `--chord` / `--chord-ink`. **Não** remapeia `--chord` na faixa.
- `.cpv-head-chip`: fill `--chord-ink`, tinta `--chord`, para tom e capo continuarem ilhas legíveis no verde.

### Painel

`liveFill` / `liveInk` do 1 = `--downbeat` / `--downbeat` (número abaixo do ponto, sobre o véu). 2–4 = `--chord`. Idle do 1 pode anelar em `--downbeat`; os outros em `--line`.

## Bordas

- 3/4, 6/8, 2/4: só muda `beatsPerBar()` — quantos números existem. 6/8 = 2 pulsos, não 6.
- Parar zera `beatClock`; a faixa apaga.
- Count-in: a coluna já marca 1–2–3–4; a faixa, se ligada, pulsa 50/50 nesses tempos também.
- BPM alto (180+): a coluna 20 px continua o relógio. A faixa inteira a 3 flashes/s é o limite WCAG 2.3.1; não capamos neste desenho — se incomodar, reduz-se a área depois.
- Acordes da cifra: flash de meio pulso que já têm (`cpv-met-hit-1` / `n`).

## Testes

- Unidade da função de hit (`running` + `beat` + `beatClock` → `'' | '1' | 'n'`), inclusive `0,5` e `1,5`.
- Coluna: 1 = downbeat, 2–4 = chord, ocioso transparente; `is-one` só no primeiro.
- Faixa: Rolar não pinta o título; com “Faixa do título”, classe some com fração ≥ 0,5; 1 e n com os tokens certos; chips invertidos no n como no 1.
- Painel: fill do 1 / 2–4 invertido em relação a hoje.
- `chrome-contrast.test.ts` deixa de exigir `--beat-rest` no pulso da coluna.

## Changelog

Em `## [Unreleased]`, português, para quem usa a cifra: o 1 da coluna fica preto ou branco conforme o tema; 2, 3 e 4 pulsam na cor do tema e continuam visíveis. Com a faixa do título ligada, ela acende na cabeça do tempo e apaga no meio — o 1 deixa de ficar invertido até o 2.

## Fora

- Som do click, count-in, follow, Rolar silencioso.
- Editor de batida / `StrumStrip`.
- Tokens `--beat-rest` do piano.
- Capar o flash da faixa em BPM alto (follow-up se o músico pedir).
