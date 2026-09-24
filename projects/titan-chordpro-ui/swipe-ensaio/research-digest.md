# Research digest — swipe-ensaio

## Scope (from Interview)

- **Problema:** no ensaio (lista com 2+ músicas), rolagem vertical da cifra e swipe horizontal de troca se roubam. O deslize dá flick/pulo e às vezes troca de música. Objetivo: dois movimentos nítidos que nunca interferem.
- **In:** só o gesto no ensaio — zonas, o que arma, o que commita, feedback visual, contrato de não-interferência.
- **Out:** dock ◀ ▶, lista, offer de fim, autoscroll nunca avança sozinho, mouse ignorado, host multicifra, leitura de 1 música.
- **Stakes (ratificado):** visual/gesto fácil de reverter; não é porta de mão única.
- **Direção dita (ainda vai a debate):** centro = só rolar; perto da borda E/D = deslize horizontal troca música. Os dois não compartilham a mesma área.
- **Destino:** `projects/titan-chordpro-ui/swipe-ensaio/`.

## Findings

- **`src/vue/use/song-swipe.ts`**: o reconhecedor é **superfície inteira + trava de eixo**, não zona. Lock aos 12px; horizontal só se `|dx| > 2 × |dy|` (~27°). Commit **só no release** passado `max(72, min(120, 28% width))` — não há flick por velocidade. Peek começa aos 10px horizontais. Mouse e `pointerKind` que não seja touch/pen viram `ignored`. A **borda esquerda de 24px é ignorada** (Safari back), não é zona de swipe. Evidence:

```9:18:src/vue/use/song-swipe.ts
export const SWIPE_LOCK_PX = 12
/** |dx| must beat this many times |dy| to count as horizontal. ~27°. */
export const SWIPE_RATIO = 2
/** Ignore a touch that starts on the viewport's left edge (Safari back). */
export const SWIPE_EDGE_PX = 24
/** Below this, the gesture is still a tap (zen), not a peek. */
export const SWIPE_TAP_PX = 10
```

```76:118:src/vue/use/song-swipe.ts
  let axis: SwipeAxis =
    opts.pointerKind === 'touch' || opts.pointerKind === 'pen'
      ? opts.x < SWIPE_EDGE_PX
        ? 'ignored'
        : 'undecided'
      : 'ignored'
  // …
        if (Math.max(adx, ady) >= SWIPE_LOCK_PX) {
          axis = adx > SWIPE_RATIO * ady ? 'horizontal' : 'vertical'
        }
```

- **`src/vue/use/useSongSwipe.ts`**: `pointerdown` no root; `move`/`up` no `window` com `{ passive: false }`. `preventDefault` **só depois** da trava horizontal. `setPointerCapture` também só no lock horizontal. Chrome/botões/dialog/offer são ignorados no down. Haptic 12ms ao armar. Um peek engole o `click` seguinte (zen). Evidence: `onMove` linhas 88–102; `onDown` 63–86; `eatClick` 135–139.

- **`src/vue/cpv.css`**: em setlist, o scroller declara `touch-action: pan-y` — o browser **possui a rolagem vertical desde o primeiro pixel**. Overflow-x hidden; overscroll contain. O commit anima o palco inteiro `translate3d(±38%)` em 200ms e entra em 260ms. O stamp Tinder rotaciona até ±10° e, armado, escala 1.1 com keyframe `cpv-swipe-arm`. Evidence: `.cpv-root.is-setlist .cpv-scroll { touch-action: pan-y; }` linhas 125–128; `data-swipe='out-next'` 210–214.

- **`src/vue/ChordproViewer.vue`**: swipe só com `setlist.on` (2+ músicas). `goSong` persiste tom/capo/speed/scrollTop. `playSwipeCommit` faz out → `goNext`/`goPrev` → in → settle. `swipeBlocked` cobre edit, sheets, overlay, e o próprio `swipeFx` (não dá para começar outro swipe no meio da animação). `@pointerdown="songSwipe.onDown"` está no **`[data-cpv-root]`**, não no scroller. **Autoscroll não pausa** durante peek — não há `if (swipeView.peeking) stopScroll()`. Evidence: `enabled: () => setlist.on.value` ~2424–2432; template 2657–2658, 2707–2711; `playSwipeCommit` 2398–2422.

- **`src/vue/chrome/CpvSwipeVeil.vue`**: overlay `pointer-events: none` com stamp + chevron + título da vizinha. Copy: “Próxima/Anterior” até armar, depois “Solte para ir”. Não pinta a cifra vizinha — só um card. Evidence: `v-if="view.peeking"`; kicker linhas 28–30.

- **Testes atuais treinam o modelo de superfície inteira.** `tests/vue/song-swipe.test.ts` começa em `x: 200` (centro de 390) e `x: 280`. 45° cai para vertical (lado seguro). Safari-back (`x < 24`) é `ignored`. Eixo, uma vez travado, não muda. `tests/browser/setlist-swipe.spec.ts` dispara o dedo em **72% da largura** (`r.width * 0.72`) — centro-direita, não borda. Há teste de “rolar para baixo não troca”, mas **não há teste de gesto que começa no centro e não pode virar horizontal**. Evidence: spec linhas 9–10, 51, 71; unit `start()` default `x: 200`.

- **Docs do produto descrevem o gesto atual, não zonas.** README e `docs/CONSUMER.md` §6: “swipe horizontal na cifra pinta fade + chevron e só confirma ao soltar depois do limiar — rolar para baixo não troca”. Dock ◀ ▶, lista e offer de fim continuam. Autoscroll nunca avança sozinho. Evidence: `README.md` 203–206; `CONSUMER.md` 285–288.

- **Análise pré-ship (2026-09-18)** em memória do workspace: recomendou peek JS + axis lock + release-past-threshold; rejeitou carousel `scroll-snap-x` (é o bug de troca acidental). Decisão em aberto na época: confirm implícito vs chip. O ship escolheu confirm implícito (threshold). Zona espacial **não** foi o modelo implementado.

- **Outros caminhos de troca (fora deste design, mas existem):** `goPrev`/`goNext` no dock; pick na `SetlistSheet`; `CpvEndOffer` no fim da auto-rolagem. `goSong` é o único commit de música.

## Open risks / seams

1. **Flick mecânico.** `touch-action: pan-y` deixa o browser rolar **antes** do JS decidir o eixo. Aos 12px, se o dedo foi “horizontal o bastante”, `preventDefault` + `setPointerCapture` **roubam** o pan nativo — a cifra pula e o véu Tinder aparece. Isso casa com o relato “começo a deslizar e sai, pula”.
2. **Lock cedo demais no centro.** 12px e ratio 2 (~27°) no meio da cifra transformam um scroll um pouco enviesado (polegar) em swipe. Peek aos 10px é visualmente barulhento. Commit em ~72–120px no celular (~28% de 390 ≈ 109px) é alcançável num único puxão diagonal.
3. **Zona de borda vs Safari back.** Hoje a esquerda de 24px **não** swipeia. O modelo pedido (borda E/D = troca) **inverte** esse ignore: a esquerda passaria a ser a zona de “anterior”, em conflito com o gesto nativo de voltar no Safari.
4. **Testes e docs vão mentir** se o contrato virar zona: o E2E em 72% da largura e o unit em x=200 passam a ser regressão, não prova.
5. **Autoscroll durante peek.** RAF de rolagem continua; um swipe no meio do ensaio de pé pode empilhar rolagem + véu + troca.
6. **Largura da zona não existe no código.** Não há constante de “faixa de borda para armar swipe” — só `SWIPE_EDGE_PX` como ignore. Polegar vs precisão é decisão de design, não de implementação atual.
7. **Animação de commit do palco (±38%)** é um segundo “flick” depois do release. Se o limiar foi cruzado por engano, a cifra inteira sai de cena em 200ms.

## Agenda seeds for debate

1. Zona espacial (centro=rola, borda=troca) vs apertar a trava de eixo na superfície inteira vs card Tinder de verdade.
2. O que o contrato deve **proibir** para o flick (pan-y nativo vs JS, lock px, preventDefault).
3. Commit: soltar após limiar vs velocidade vs chip.
4. Borda esquerda vs Safari back.
5. Largura da zona e o visual (stamp Tinder vs peek quieto na borda).
