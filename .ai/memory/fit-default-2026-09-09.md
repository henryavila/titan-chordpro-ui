# `fitDefault` passou a ser `true` (2026-09-09)

Decisão do dono do produto, pedida durante a validação no celular: **o ajuste ao
espaço vale por padrão**; o consumer desliga com `:fit-default="false"`.

## O que isso reverte

`docs/HANDOFF-CHROME-EMBED-LAYOUT-2026-09-06.md` registrava "Fit: opt-in, **nunca
default**". A linha não foi apagada — ganhou a anotação da reversão com data, para
o documento não contradizer o código. **Se for reverter de novo, anote lá também**;
o handoff é registro datado, não espelho do código.

## Por que não quebrou nada

A arquitetura já separava as duas coisas e não precisou mudar:

- `fit` é `ref<boolean | null>`; `null` = o leitor não escolheu.
- `fitOn = isEdit ? false : (fit ?? props.fitDefault)`.

Só a constante virou. A escolha do leitor continua ganhando do padrão, e o
editor continua sem ajuste.

## Efeito medido

Na demo, viewport 430×860, `002 - Em Gratidão`: documento de **1678px** com o
ajuste ligado, **2636px** desligado. 57% a mais de rolagem sem ele.

## Cuidado ao mexer

Três testes de preferências (`tests/vue/theme-control.test.ts`,
`tests/vue/storage-seam.test.ts`) apertam `a` uma vez e conferem o blob salvo. O
assunto real deles é preservar chaves alheias e reparar blob corrompido — o valor
do `fit` é incidental e **inverte junto com o padrão**. Se o padrão mudar de novo,
são esses três que quebram, e a correção é trocar o booleano esperado.
