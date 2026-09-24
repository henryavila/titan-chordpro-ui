# Design — Swipe de troca no ensaio

> **Aprovado** (usuário, 2026-09-19) · critic Approved · direção B2: **zonas exclusivas**. Síntese do debate Uma / Aria / Priya-contrária.  
> Paths: `projects/titan-chordpro-ui/swipe-ensaio/` · digest: `research-digest.md`.

## Interview

| Campo | Decisão ratificada (B0 + B2) |
|---|---|
| **Problema** | No ensaio (lista 2+), rolagem vertical da cifra e swipe horizontal de troca se roubam. O deslize dá flick/pulo e às vezes troca de música. Objetivo: dois movimentos nítidos que nunca interferem. |
| **In-scope** | Só o gesto no ensaio: zonas, o que arma, o que commita, feedback visual, contrato de não-interferência. |
| **Out-of-scope** | Dock ◀ ▶; lista; offer de fim; autoscroll nunca avança sozinho; mouse ignorado (permanece); host multicifra; leitura de 1 música. |
| **Done-when (design)** | Este doc: contrato do gesto; critic Approved; usuário diz Aprovar design. Sem código neste ciclo. |
| **Stakes** | Visual/gesto fácil de reverter; não é porta de mão única. |
| **Fontes** | `src/vue/use/song-swipe.ts`, `src/vue/use/useSongSwipe.ts`, `src/vue/chrome/CpvSwipeVeil.vue`, `src/vue/cpv.css`, `src/vue/ChordproViewer.vue`, `tests/vue/song-swipe.test.ts`, `tests/browser/setlist-swipe.spec.ts`, `README.md`, `docs/CONSUMER.md`, análise 2026-09-18. |
| **B2** | Zonas exclusivas (Uma+Aria). Centro nunca troca. Trilho nunca rola nativo. Dono no `pointerdown`. |

## Context

O swipe de ensaio já está no pacote (`0.5.0`). O reconhecedor é **superfície inteira + trava de eixo**, não zona. verified_by: `src/vue/use/song-swipe.ts` L9–18, L76–118 (`SWIPE_LOCK_PX = 12`, `SWIPE_RATIO = 2`, eixo após 12px se `|dx| > 2 × |dy|`).

Commit é **release** passado `max(72, min(120, 28% width))`. Não existe flick por velocidade. Peek começa aos 10px horizontais. Mouse e left-edge Safari (`SWIPE_EDGE_PX = 24`) são `ignored`. verified_by: `song-swipe.ts` L62–65, L76–81, L122–126.

O scroller em setlist declara `touch-action: pan-y`. `preventDefault` e `setPointerCapture` só disparam **depois** do lock horizontal. verified_by: `src/vue/cpv.css` L125–128; `src/vue/use/useSongSwipe.ts` L88–102. Esse atraso é o flick: o browser já rolou, o JS rouba o pointer, a cifra pula.

O commit anima o palco `translate3d(±38%)` em 200ms, troca a música, settle 260ms. O véu pinta um stamp Tinder com rotate ±10°. verified_by: `src/vue/cpv.css` L156–177, L210–235; `src/vue/chrome/CpvSwipeVeil.vue` L13–35; `ChordproViewer.vue` `playSwipeCommit` L2398–2422.

Autoscroll RAF **não** pausa durante peek. verified_by: `ChordproViewer.vue` — `songSwipe` L2424–2432 sem ramo em `scrolling` / `stopScroll`.

Testes atuais **provam o modelo errado para este design**: unit começa em `x: 200` (centro de 390); E2E dispara em 72% da largura. Não existe teste “down no centro não vira horizontal”. verified_by: `tests/vue/song-swipe.test.ts` L18–27, L53–57; `tests/browser/setlist-swipe.spec.ts` L9–10, L51.

Docs descrevem o gesto atual (swipe em qualquer lugar da cifra + limiar). verified_by: `README.md` L203–206; `docs/CONSUMER.md` L285–288.

`goSong` / dock / lista / `CpvEndOffer` ficam. Swipe só existe com `setlist.on` (2+ músicas). verified_by: `ChordproViewer.vue` L2345–2355, L2424–2428.

## Non-goals

- Não redesenhar dock ◀ ▶, `SetlistSheet`, nem `CpvEndOffer`.
- Não ligar swipe com uma música só, nem no host multicifra.
- Não aceitar mouse / trackpad como swipe (permanece `ignored`).
- Não fazer o autoscroll avançar sozinho para a próxima música.
- Não lutar com o gesto nativo de voltar do Safari (`preventDefault` na faixa 0–24px da viewport).
- Não adicionar chip “tem certeza?” neste ciclo.
- Não adicionar commit por velocidade (`vx`).
- Não reintroduzir carousel / `scroll-snap-x` na cifra.

## Decisions

1. **Dono no `pointerdown`, zona imutável.** O pixel do down classifica o pointer para a vida do gesto. Centro ou trilho. Sem reclassificar no `move`. Sem `SWIPE_LOCK_PX` / `SWIPE_RATIO` como dono da superfície. Um pointer que nasceu no centro **não** arma troca se o dedo caminhar até a borda.

2. **Centro = só rolagem nativa.** Down no miolo: JS **não** chama `preventDefault`, **não** faz `setPointerCapture`, **não** escreve `transform` / peek / `data-swipe` no palco. `touch-action: pan-y` no scroller permanece. Vertical desde o frame 0. Esse pointer **nunca** commita música.

3. **Trilho = só troca de música.** Down no trilho esquerdo ou direito: o scroller **não** recebe pan-y nativo daquele pointer. `touch-action: none` (ou `pan-x`) no elemento do trilho é **CSS estático**, definido antes do gesto — não troca no meio. Capture e `preventDefault` no down do trilho, não depois de 12px. Vertical no trilho **não** rola a cifra (custo aceito da exclusividade B2). Resting sem deslocamento horizontal **não** commita.

4. **Geometria dos trilhos.** Largura por breakpoint do viewer (`xs<400 sm<640 md<900 lg<1280 xl`): **64px no celular** (xs/sm, `<640`) e **128px no tablet+** (md/lg/xl). Evidência no aparelho 2026-09-19: 64px certo no celular, 128px certo no tablet. Cap em px (não % da tela). Esquerda: a faixa **0–24px** permanece morta (Safari back, `SWIPE_EDGE_PX`). O trilho de “anterior” começa em **24px**. Direita: trilho colado na borda direita do `.cpv-root`.

5. **Commit = soltar passado o limiar.** Fórmula atual permanece: `max(72, min(120, 0.28 * width))` com `width` do viewer. Commit **somente** no `pointerup` com `armed`. Abaixo do limiar, snap-back, música intacta. **Proibido** commit por velocity. **Proibido** chip de confirmação neste ciclo. Fim de lista: peek existe, `armed` nunca (rubber-band atual). Depois do down no trilho o pointer **pode atravessar o miolo**; `dx` é deslocamento livre, não “ficar dentro dos 128px”. O miolo não rola nesse pointer porque o trilho capturou no down (decisão 3). Prev = down no trilho esquerdo + `dx` positivo além do limiar; next = down no trilho direito + `dx` negativo além do limiar.

6. **Peek quieto. Sem stamp Tinder.** Sem rotate ±10°, sem keyframe `cpv-swipe-arm`, sem card “descarte”. No arraste do trilho: chevron + título da vizinha, progresso amortecido no `--cpv-swipe-p`. Copy: “Anterior” / “Próxima” até armar; “Solte para ir” quando `armed`. `pointer-events: none` no véu permanece.

7. **Commit visual = troca imediata + fade curto do véu.** Proibido o palco `translate3d(±38%)` em 200ms + swap + settle 260ms (`data-swipe=out-|in-|settle-`). No release armado: `goNext`/`goPrev` no mesmo turno e o véu some em um fade curto. `prefers-reduced-motion: reduce` já ia direto à troca — passa a ser o caminho único, com ou sem reduce. E2E deixa de exigir `data-swipe=out-|in-|settle-`. verified_by do atual (a proibir): `playSwipeCommit` L2398–2422; CSS L210–235.

8. **Autoscroll pausa no peek do trilho.** Enquanto `peeking` no trilho, o RAF de rolagem não empurra `scrollTop`. Ao cancelar (release desarmado) ou ao terminar o commit, retoma do ponto pausado — o mesmo contrato do popover de acorde (design diagramas). Não retomar no meio do settle.

9. **Proibições do flick (testáveis).**
   - Proibido `preventDefault` / `setPointerCapture` em pointer cujo down foi no centro.
   - Proibido alterar `touch-action` no meio do gesto.
   - Proibido o scroller nativo e o peek JS andarem no mesmo pointer.
   - Proibido lock-then-steal na superfície inteira (`SWIPE_LOCK_PX` + ratio como dono).
   - Proibido peek / `data-swipe` no miolo.
   - Proibido velocity como critério de commit.

10. **Caminhos de troca que ficam.** `goSong` continua o único commit. Dock ◀ ▶, pick na lista, `CpvEndOffer` intactos. Swipe continua gated em `setlist.on` e `swipeBlocked` (edit, sheets, overlay, `swipeFx` em curso).

11. **Testes deixam de treinar superfície inteira.** Down em `x` no miolo (ex. 50% da largura, longe dos 128px) → `axis` nunca `horizontal`, véu ausente, título da cifra intacto no up. Down em `x < 24` → não arma. Down no trilho direito + `dx` negativo além do limiar → `next`. Down no trilho + `dy` grande sem `|dx|` de limiar → sem commit **e** sem `scrollTop` nativo da cifra (exclusivo). E2E deixa de disparar em `width * 0.72` como se fosse zona válida — 72% é miolo.

12. **Docs.** README e `docs/CONSUMER.md` passam a dizer: no celular, **deslize na borda** troca de música; o centro da cifra só rola. Sem “swipe em qualquer lugar da cifra”.

## Chosen approach

Três abordagens pesadas no debate (Uma, Aria, Priya-contrária). O usuário ratificou **A**.

| | Abordagem | Veredito |
|---|---|---|
| **A** | Zonas exclusivas no `pointerdown`: centro = pan-y nativo; trilhos = troca. Dono não troca no meio. | **Escolhida.** |
| **B** | Zonas de permissão: centro nunca troca; no trilho, vertical ainda rola. | Rejeitada em B2 (o usuário pediu exclusivas). |
| **C** | Superfície inteira, lock 12px/27° muito mais duro; Y ganha até intenção clara. | Rejeitada. É o modelo atual com outros números; o steal permanece. |
| **D** | Chip “próxima?” depois do swipe. | Rejeitada neste ciclo (Non-goals). Plano B se A vazar em palco, não v0. |
| **E** | Tinder de card inteiro (cifra desliza como carta). | Rejeitada. Cifra de ensaio é documento no eixo Y, não carta. |

**Como A se implementa (sem lista de tarefas):** dois hit-targets (trilhos) com `touch-action` estático; o scroller do miolo nunca entra no `beginSongSwipe` horizontal; o reconhecedor atual (`beginSongSwipe`) ou um sucessor **só nasce** se o down caiu no trilho; threshold/release/canPrev/canNext/`goSong` reutilizam o que já existe.

O custo aceito: polegar que apoia no trilho e tenta rolar **não** move a cifra. Troca acidental por *repouso* não existe — commit exige deslocamento horizontal até o limiar. Troca acidental por *scroll no miolo* some, que é o bug relatado.

## Rejected alternatives

- **Apertar `SWIPE_LOCK_PX` / `SWIPE_RATIO` na superfície inteira (Priya).** Dissenso preservado: o polegar mora na borda; zona inverte o acidente; o job é “arrastar o que estou lendo”; stakes “fácil de reverter” pediam patch, não mapa novo; Safari back é landmine se a troca vive na lateral. **Por que não:** o flick do repo é lock-then-steal (`pan-y` nativo + `preventDefault` tarde), não um ângulo frouxo. Apertar o lock empurra o falso positivo; não elimina a classe. Evidência: `useSongSwipe.ts` L93–102 só previne depois de `axis === 'horizontal'`.
- **Zonas de permissão (trilho ainda rola).** Atendia o polegar-na-borda da Priya. **Por que não:** B2 pediu exclusivas; eixo local no trilho reabre dois donos no mesmo pointer (o steal, em miniatura).
- **Commit por velocity.** As três vozes rejeitaram. É o acidente (“começo a deslizar e sai”).
- **Chip de confirmação (v0).** Priya compraria chip antes de zona. **Por que não agora:** entrevista/B2 querem gesto, não segundo toque; dock/lista/offer já são o caminho explícito (Non-goals).
- **Carousel `scroll-snap-x` / cifra vizinha no DOM.** Análise 2026-09-18 já rejeitou: é o bug de troca acidental. O peek continua sendo overlay, não a próxima cifra montada.
- **Stamp Tinder + palco ±38% em dois tempos.** Metáfora de descarte + segundo flick visual. Substituído por peek quieto + um tween.

## Open questions

- **Largura do trilho por BP.** Debate: 56–72. Validação 2026-09-19: 64px no celular, 128px no tablet. xs/sm = 64, md/lg/xl = 128. Cap em px. O limiar 72px **não** reabre a largura do trilho — decisão 5: `dx` é livre após o down.
- **Android gesture-nav nas duas bordas.** Inset esquerdo 24px está no código Safari. unverified: se webview Android come também a direita, o trilho direito precisa do mesmo inset. Evidência: um `pointerdown` na borda direita em Chrome Android que dispara “voltar/home” em vez do swipe.
- **Hit-target do trilho vs chrome.** Cabeçalho / dock / offer já são ignorados no down (`useSongSwipe.ts` L68–73). Trilho atrás de chrome visível **não** swipeia — o ignore de chrome ganha. Sem decisão extra.
- **Pausa de autoscroll vs metrônomo.** Design diagramas pausa os dois no popover de acorde. Aqui a decisão 8 pausa **só a rolagem**. Metrônomo durante peek de trilho permanece soando. Reabrir só se o ensaio de pé mostrar conflito (som anda, cifra parada).

## Self-review against code-quality gates

- G1 read-before-claim: applied — claims sobre o gesto atual citam `song-swipe.ts` L9–18/L62–81/L76–118, `useSongSwipe.ts` L88–102, `cpv.css` L125–128 e L210–235, `ChordproViewer.vue` `playSwipeCommit` / `songSwipe`, testes unit/E2E nas linhas acima.
- G2 soft-language: applied — varrido `should/probably/typically/usually/maybe/perhaps`; 0 ocorrências nas seções Interview / Context / Non-goals / Decisions / Chosen approach.
- G6 reference-or-strike: applied — comportamento atual com `verified_by`; Android inset direito e metrônomo-durante-peek marcados `unverified` em Open questions.
