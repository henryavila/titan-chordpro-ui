# Importar Cifra Club (2026-09-11)

O link de cifra nova é **só Cifra Club**. Arquivo e texto colado continuam
ChordPro / OnSong / acordes sobre a letra.

## O que o designer tinha vs o que faltava

`importar.js` convertia texto. Não lia o HTML. A demo devolvia `toPlain` de uma
fixture — a URL do Unidos em Cristo virava Escuta Meu Clamor.

## Como lê a página

- `fetchChart` (host) busca o HTML. Na demo: proxy `/__cifra_fetch` (CORS).
- `fromCifraClubHtml`: `<pre data-chord-content>`, pares `.kvMV`, JSON-LD
  (título/artista), tom no `data-anchor="--chord-tone"`.
- Acordes BR: `D7(4)`, `C7M`, `Em7(11)`. `unwrapChord` não pode comer o `)` de
  `D7(4)`.

## Armadilhas (já quebraram a UI)

- Branco entre cada par `.kvMV` → cada linha virava um bloco de refrão no
  editor. Juntar pares; branco só em parágrafo de verdade.
- `[Refrão]` não tem `[Verso]` depois: `{soc}` fechava só no fim do arquivo.
  Linha em branco no `fromPlain` fecha o refrão.
- Branco logo após `[Refrão]` fechava `{soc}` antes da primeira linha do
  refrão — não emitir esse branco.
- Os `.` na letra (`f.az`, `uni.ao`) são o **ataque do acorde**. Merge nas
  colunas originais, depois tira o ponto. Apagar antes desloca o acorde.

## Demo

Índice em `/` agrupa tocar / escrever / host — não 4 receitas + laboratório.
Cifra nova: `/standalone.html?criar=1`.
