# Relógio da auto-rolagem — camadas e invariante (2026-09-09)

O modelo em si está documentado no README ("Auto-rolagem: tempo musical") e nos
comentários de `src/core/timeline.ts`. Aqui fica o que **não** se lê no código.

## Por que o bug passou tanto tempo

A suíte afirmava o contrato em **unidades internas da timeline** (`t.segs[0].bars
=== 8`) e passava feliz enquanto uma estrofe de 4 linhas ia embora em 1,8 s. Não
havia um único teste de **relógio de parede** nem de px/s. `tests/core/timeline-charts.test.ts`
existe para isso: mede segundos por linha cantada sobre cifras reais.

**Regra para o futuro:** mudança no relógio se valida em segundos e px/s sobre o
corpus de `fixtures/`, não em `bars` de segmento.

## As três causas que se somavam

1. `musicOf` contava `x///` do bloco inteiro e marcava tudo como exato. Um
   `[Am]x///` no fim de uma estrofe declarava a estrofe com 4 pulsos. 34% dos
   blocos cantados do corpus caíam nisso. `060-deixai-vir` tem um `[D]x` que
   parece typo e fazia um refrão inteiro passar em 0,7 s a 341 px/s.
2. `runSec()` devolvia a duração declarada enquanto `pxAtBars` mapeava sobre
   `t.bars`. Quando os dois divergiam (clamp do `k`, piso de 2,2×), **todo**
   segmento tocava na razão entre eles — inclusive os contados. `entrega-1` a
   1,87×, `entrega-2` a 4,88×.
3. `beatsPerBar` lia o numerador e descartava o denominador. Só doeu em 6/8,
   que é 1 de 36 assinaturas do corpus — por isso não apareceu na auditoria
   inicial. Foi o usuário que perguntou.

## Ambiguidade que sobrou (não resolvida)

`marksPerBeat` assume a convenção padrão: em compasso composto o `{tempo}` é a
semínima pontuada. Se alguém escrever 6/8 com tempo em colcheias (`{tempo:225}`
em vez de `75`), a camada exata fica 3× rápida e **não há como distinguir pelo
arquivo**. `{duration:}` corrige o total, não a camada exata. Só existe uma cifra
6/8 no corpus (`005 - Tua Vontade`) — se aparecerem mais, dá para heurística por
faixa de BPM.

## Aberto para ajuste fino

- **`ANCHOR_RATIO = 0.5`** deixa a página ~15–20 s parada no topo numa viewport
  de 860px (medido no navegador). É o desenho — a introdução fica visível
  enquanto é tocada — mas é um pedaço grande do percurso no celular. Não mexi.
- **Linha instrumental com sílaba solta.** Em `entrega-1` o interlúdio é
  `[A]for   [D]x///   [A]x///   [D]x/[E]//`: o "for" que sobrou do verso
  anterior faz `isPlayedLine` classificar como cantada, e o bloco ganha 2
  compassos de estimativa além dos 13 pulsos (15 s em vez de ~10 s). Erra para o
  lado lento, que num interlúdio é seguro. Resolver exige decidir onde termina a
  frase cantada.
- `BEATS_PER_ROW = 8` foi calibrado em 4/4 e conferido contra as durações
  declaradas. Cifras em 2/4 não existem no corpus e devem subestimar.
