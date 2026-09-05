# Handoff: ChordPro Viewer (1 cifra)

## Visão geral
Superfície única, shell-less, para o músico ler e usar **uma** cifra ChordPro no ensaio ou ao vivo:
letra + acordes, transpose (só quando há `key`), tema claro/escuro/auto, bias tipográfico,
auto-scroll com velocidade base automática + afinação humana, modo ajuste ao espaço (opt-in) e
export CHO/PDF. Sem nav global, sem multi-cifra, sem editor de acordes.

Fonte do brief: `uploads/00-design-system.md`, `uploads/01-screens.md`, `uploads/02-fixtures.md`.

## Sobre os arquivos de design
Os arquivos deste pacote são **referências de design feitas em HTML** — protótipos que mostram
aparência e comportamento pretendidos, **não** código de produção para copiar. A tarefa é
**recriar esses designs no ambiente do codebase alvo** (Vue/SDA, React, etc.), usando os padrões e
bibliotecas já estabelecidos lá. O legado de referência é `ChordproViewer.vue` (sda-v2).

Especificamente: `fixtures.js` existe só para alimentar o protótipo. No app real a cifra chega do
host como string ChordPro — no protótipo isso é a prop `source` (quando vazia, cai nas fixtures).

## Fidelidade
**Hi-fi.** Cores, tipografia, espaçamentos, estados e microinterações estão definidos e devem ser
reproduzidos com precisão — dentro do sistema de tokens do codebase, mapeando por nome semântico.

---

## Tela: Viewer 1-cifra

**Objetivo:** ler a cifra com conforto e operar tom/ritmo/legibilidade com gestos de uma mão.

### Layout
- Raiz: `position:relative; height:100dvh; min-height:460px; overflow:hidden`. Em embed, ocupa o
  frame do host sem vazar UI.
- Camada de fundo: `radial-gradient(120% 80% at 50% -10%, var(--glow), transparent 60%)`,
  `pointer-events:none`.
- **Área de leitura** (única região rolável): `position:absolute; inset:0; overflow-y:auto`.
  Conteúdo centralizado, `max-width:880px`, `padding:96px 28px 132px` (o topo/base abrem espaço
  sob as barras flutuantes).
- **Barra superior** (flutuante, z 12): centralizada, `max-width:880px`,
  `padding:9px 10px 9px 16px`, `radius:15px`, fundo `--veil`, borda `--line`,
  `backdrop-filter: blur(22px) saturate(150%)`, sombra `--shadow`. Conteúdo em flex com
  `gap:10px 14px` e `flex-wrap:wrap` (em telas estreitas os blocos quebram para linhas).
- **Barra inferior** (flutuante, z 13): coluna centralizada, `padding:0 16px 18px`, com dois
  grupos: chip de velocidade (só quando rolando) e a barra de ações (`radius:17px`, `padding:6px`,
  mesmo vidro).
- **Barra de progresso**: 2px no topo absoluto, largura = progresso do scroll,
  `linear-gradient(90deg, --chord-edge, --chord)`, `transition: width .1s linear`.

### Corpo da cifra
Quatro classes de linha, todas dentro do container de 880px:

1. **Estrofe** (`isStanza`): `padding:0 16px`, margem inferior `blockGap`.
   Cada linha é um flex `wrap` com `row-gap:7px`; cada segmento é uma coluna
   [acorde, texto]. Acorde: Space Mono 700, `font-size = lyric × 1.18`, cor `--chord`,
   `padding-right:0.8em`, `white-space:nowrap`, dentro de uma caixa de altura `chord × 1.4`
   alinhada ao baixo. Letra: Sora 400, `line-height:1.32`, cor `--lyric`,
   `white-space:pre-wrap; overflow-wrap:anywhere`.
   Quando um acorde cai **no meio de uma palavra**, ele sai do fluxo (largura zero, `overflow:visible`)
   e fica sobre a sílaba — sem isso o segmento abriria um buraco e a palavra apareceria partida.
2. **Refrão** (`isChorus`, linhas entre `{soc}`/`{eoc}`, consecutivas agrupadas em um bloco):
   mesmo miolo, dentro de card `radius:14px`, fundo `--block`, borda `--block-line`,
   `padding:12px 16px 14px`. A letra usa `--text` (um passo mais forte que a estrofe).
3. **Comentário-rótulo** (`{c:}` seguido de conteúdo musical): linha com ponto de 5px `--chord`,
   texto 11px / `letter-spacing:.14em` / uppercase / 600 / `--muted`, seguido de régua 1px
   `--line-soft` ocupando o resto da largura. Margem inferior 12px.
4. **Painel de execução** (`{c:}` consecutivos que **não** precedem conteúdo musical): card
   `radius:15px`, fundo `--veil`, borda `--line-soft`, rótulo "EXECUÇÃO" (9.5px, `.2em`, 700,
   `--muted`) com traço de 14px em `--chord`; itens em Space Mono 11.5px `--muted`.
5. **Tab** (`{sot}`…`{eot}`): card `radius:12px`, fundo `--veil`, `overflow-x:auto`,
   Space Mono 11.5px, `white-space:pre`.

Linhas em branco não viram elemento: viram o `blockGap` entre blocos.

### Escala tipográfica
- `base = 18 + bias × 1.7` px, `bias ∈ [-3, +5]`.
- Modo ajuste ligado: `fitFactor = clamp(0.68, 1.25, (min(width,880) − 56) / (maxChars × base × 0.485))`,
  onde `maxChars` é o comprimento da linha mais longa **sem** os colchetes de acorde.
- `lyric = base × fitFactor`; `chord = lyric × 1.18`; `chordBox = chord × 1.4`.
- `rowPad` = 3px no modo ajuste, 6px fora. `blockGap = round(lyric × (fit ? 2.1 : 2.6))`.
- **Proibido multi-coluna** em qualquer modo.

### Controles — barra superior
- **Título** 15.5px/600/`-0.015em`, uma linha com ellipsis. Subtítulo (se houver) 10.5px uppercase
  `.14em` 600 `--muted`.
- **Meta**: Space Mono 11px `--muted` — `{tempo} BPM`, `{time}`, `{duration}` quando existirem.
- **Grupo de tom** (só renderiza se a cifra tem `key`): pílula `radius:11px`, altura 38px, fundo
  `--chord-soft`, borda `--chord-edge`, contendo:
  - `−` e `+` (40×34, radius 9, hover `--chord-hover`): ±1 semitom, limite ±11. Dimensionados para
    o polegar; os demais botões da pílula têm 32px de altura.
  - Rótulo "TOM" 8.5px + tom exibido Space Mono 16px 700 `--chord` + badge de offset
    (`+2`/`−3`) em `--chord` sobre `--chord-ink` quando offset ≠ 0.
  - Botão **Capo** (abre popover) — fundo `--chord-fill` quando capo > 0.
  - Botão **Original** — só quando offset ≠ 0 ou capo > 0; zera ambos.
- **Popover de capo**: 250px, ancorado à direita, `radius:15px`, fundo `--veil-2`,
  animação `rise .18s ease-out`, com stepper 0–9, rótulo ("Sem capo" / "3ª casa"), texto de ajuda
  explicando forma vs. som, e "Tirar o capo" quando capo > 0. Fecha com Esc ou clique fora.

### Controles — barra inferior
- **Rolar / Parar**: 36px de altura; parado = borda `--line`, fundo transparente, ícone triângulo
  (`clip-path: polygon(0 0, 100% 50%, 0 100%)`); rolando = fundo `--pill`, texto `--pill-ink`,
  ícone quadrado 2px.
- **A− / A+**: 36×36, bias tipográfico.
- **Ajuste**: toggle com checkbox 14px; ativo = fundo `--sel`, borda `--sel-line`.
- **Tema**: cicla auto (◐) → claro (○) → escuro (●), com rótulo textual.
- **Export ↓**: abre a folha modal.
- **Tela cheia ⤢/⤡**: `requestFullscreen` com fallback para fixed + `z-index:2147483000`.
- **Chip de velocidade** (só quando rolando): "VELOCIDADE" + `−` / `1.00×` / `+` + progresso `%`.

### Folha de export (modal)
Overlay `--scrim` + `blur(6px)`; card 400px, `radius:18px`, fundo `--veil-2`, `rise .2s`.
Cabeçalho "EXPORTAR em {tom}[ · capo n]". Duas linhas de 52px: `.cho` ChordPro e `PDF` Documento.
O PDF mostra spinner + "gerando…" enquanto ocupado.

### Export PDF (implementado)
Gerado no cliente com **jsPDF 2.5.1**, carregado sob demanda no primeiro export (não no boot);
falha de carga cai no estado de erro. Página **A4 retrato sempre** (sem opção de carta), margem 48pt.

- **Cabeçalho.** Página 1: título Helvetica bold 17pt `#141414`; subtítulo/artista 9pt `#6E6E6E`;
  à direita, "Tom X · Capo n", BPM, compasso e duração quando existirem. Páginas seguintes: título
  8.5pt `#8C8C8C` à esquerda e o tom à direita. Régua 0.7pt `#DCDCDC` sob o cabeçalho e número da
  página centralizado a 30pt do pé.
- **Corpo.** Duas linhas monoespaçadas alinhadas por coluna: acorde em Courier bold **12.2pt**
  `rgb(17,84,48)` sobre a letra em Courier 10.5pt `#191919` — o acorde é maior de propósito, para
  não embolar com a letra durante a execução. Para o alinhamento por coluna continuar exato com dois
  tamanhos, o acorde é desenhado com `charSpace` negativo (`larguraDeColunaDaLetra − 0.6 × 12.2`),
  devolvendo a mesma largura de avanço. O acorde fica **próximo** da sua letra: apenas 10.6pt de
  avanço entre a linha de acordes e a letra (contra 13.2pt entre linhas de letra), o que agrupa o
  par visualmente e economiza folha.
  Largura útil = 79 colunas; a quebra corta acorde e letra no **mesmo índice**, preferindo o último
  espaço da letra (e nunca antes de 55% da largura), e realinha a continuação.
- **Refrão.** Indentado 14pt com régua vertical 1.4pt `rgb(24,96,56)` na margem.
- **Comentário-rótulo.** Helvetica bold 8.6pt `#5A5A5A` em caixa alta, com régua até a margem direita.
- **Painel de execução.** Faixa `#F5F6F8` com texto Helvetica italic 9pt `#696969`.
- **Tab.** Courier `#3C3C3C`, preservando as colunas. Nunca é cortada: o corpo é medido antes —
  a fonte encolhe de 8.6pt até no mínimo 5.6pt para a linha mais larga caber na largura útil, e se o
  bloco não couber no que resta da página ele vai inteiro para a próxima (só flui entre páginas se
  for maior que uma página inteira).
- **Quebra de página.** Verificada antes de cada par: acorde e letra nunca são separados.
- **Escala.** O PDF usa sempre a escala padrão — bias tipográfico e modo ajuste servem à tela, não
  ao papel. Transpose e capo **são** respeitados (exporta o que está à vista).
- **Nome do arquivo.** Título saneado + `.pdf` (mesma base do `.cho`).
- Estado ocupado ("gerando…") durante a geração; qualquer exceção vira a faixa de erro com
  "Tentar de novo". A prop `pdfShouldFail` força o erro para revisão do estado.

### Feedback
- **Regiões live permanentes**: dois containers visualmente ocultos existem **sempre** no DOM — um
  `role="status" aria-live="polite"` com o texto do toast e um `role="alert" aria-live="assertive"`
  com o erro corrente. As caixas visuais de toast e erro são decorativas (sem role), porque região
  live criada junto com a mensagem não é anunciada de forma confiável.
- **Toast**: centralizado a 78px do fundo, `radius:11px`, 12.5px, some em 2.2s.
- **Erro de export**: faixa no topo, fundo `--danger-soft`, borda `--danger`, com "Tentar de novo"
  e fechar. Erro **precisa** ser visível (o legado só logava).

---

## Estados
| Estado | Tratamento |
|---|---|
| erro de leitura | Fonte que não é ChordPro legível (bytes de controle, nada reconhecível): tela centralizada com marca `!` em `--danger`, "Não foi possível ler esta cifra" e a razão em `--muted`. Prop `forceParseError` força o estado. |
| loading | Fonte ainda não entregue: spinner 22px (`--chord` no topo do anel) + "Preparando a cifra…". |
| empty | String vazia: placeholder tracejado 46px + "Nenhuma cifra carregada" + explicação; nenhum controle de conteúdo. `parse('')` não pode explodir. |
| populated | Cifra + controles. Variantes: scroll on/off, fit on/off, transposed, claro/escuro. |
| error (export) | Faixa de erro descrita acima. |
| offline / first-time | N/A. |

Todos os estados valem para mobile e desktop, claro e escuro.

---

## Interações e comportamento
- **Transpose**: 1 semitom por passo; acidentes seguem a `key` (se contém `b`, usa bemóis).
  Muda o tom exibido, todos os acordes e o `{key:}` do arquivo exportado. Para o auto-scroll e
  zera a posição (comportamento do legado). Reversível pelo botão Original ou tecla `0`.
- **Fonte nova** (host trocou a cifra): para a rolagem, zera tom, posição e velocidade, e adota o
  `{capo: n}` declarado no arquivo, se houver.
- **Capo**: não altera o som; altera a **forma** mostrada — acordes renderizados com
  `shape = offset − capo`. O export remove qualquer `{capo:}` existente e escreve `{capo: n}` no topo.
- **Auto-scroll**:
  - Velocidade base: `duration` (`mm:ss`) → `max(6, total/segundos)`; senão `tempo` (BPM) →
    `max(10, bpm × 0.42)`; senão `28` px/s.
  - Afinação humana: `×1.12` por passo, limitada a `[0.3, 3]`.
  - Para no fim do conteúdo; para e zera ao trocar de cifra ou de tom.
  - Recalculada apenas quando a música ou a altura do conteúdo muda (memoizada), nunca por frame.
  - **Resize/reflow durante a rolagem** (rotação, bias, modo ajuste): preserva a **fração lida**, não
    o pixel — a posição é remapeada para o novo `scrollHeight`.
  - Loop via `requestAnimationFrame` com acumulador em ponto flutuante (não `scrollTop +=`), com
    `dt` limitado a 250ms para não dar salto ao voltar de uma aba em segundo plano.
  - **Arrasto durante a rolagem:** o músico pode arrastar a cifra a qualquer momento (voltar um
    trecho que passou rápido demais, adiantar). A rolagem **não** para e **não** puxa de volta:
    quando a posição muda por fora do passo automático (diferença > 1.5px do último valor escrito
    pelo loop), o acumulador adota a posição do usuário e continua dali. Implementado com um
    listener de `scroll` no container comparando `scrollTop` com o último valor escrito.
- **Auto-hide dos controles**: com `autoHide` ligado e rolagem ativa, 2.6s sem interação levam a
  opacidade a 0 (`transition .35s`) e `pointer-events:none`; qualquer pointer/tecla/wheel traz de
  volta. Enquanto oculto, aparece a dica "Mova para mostrar os controles".
- **Teclado**: espaço = rolar/parar; `+`/`−` = tom; `0` = original; `←`/`→` = velocidade (só
  rolando); `f` = tela cheia; `t` = tema; `a` = ajuste; `c` = capo; `Esc` fecha popover/modal.
- **Animações**: `rise` (10px + fade, .18–.2s ease-out) para popover/modal/toast/erro;
  `fade .18s` para overlays; `spin .8s linear` para spinners.

## Responsivo
Abaixo de **480px** (largura observada por `ResizeObserver`, não media query — o viewer pode estar
embutido): a meta de BPM/compasso/duração é omitida e o grupo de tom passa a ocupar a linha inteira
da barra superior. Acima disso, tudo em uma linha. A barra inferior sempre quebra por `flex-wrap`.

## Preferências persistidas
`localStorage`: `cpv:prefs` guarda **apenas o que diverge do default** (`theme` só se escolhido,
`bias` só se ≠ 0, `fit` só se o toggle foi usado); quando nada diverge, a chave é removida — assim
mexer nos controles não vira preferência permanente sem intenção. `cpv:fitSeen` = `"1"`
depois que a dica do modo ajuste é vista. Tom, capo e velocidade **não** persistem — são da sessão.

## Micro-descoberta do modo ajuste
Na primeira visita, uma dica discreta acima da barra inferior ("Ajuste encaixa a cifra no espaço da
tela — e dá para voltar ao padrão quando quiser") com botão de fechar. Some ao usar o Ajuste, ao
fechar, ou 9s depois — e o cronômetro de 9s **só começa quando a dica está de fato na tela**, então
o flag `cpv:fitSeen` nunca é queimado sem a pessoa ter visto. Aparece com o modo ajuste ligado ou
desligado (ela explica o modo, não o estado). Depois de vista, nunca volta.

## Acessibilidade
- Anúncios por regiões live permanentes (ver §Feedback), não por elementos que nascem com a mensagem.
- Folha de export: `role="dialog" aria-modal="true"`, foco inicial na primeira ação (não no fechar),
  Tab preso dentro do diálogo, foco devolvido ao botão que abriu.
- `prefers-reduced-motion: reduce` zera durações de animação e transição.
- Contraste: acento claro `#17713C` sobre `#F5F6F8` ≈ 5.3:1; `--muted` claro ≈ 5.8:1 — AA.
- Foco visível em todos os controles (`outline 2px var(--focus)`).

## Estado (variáveis)
Props: `source` (string ChordPro do host), `fixture`, `theme`, `fitDefault`, `autoHide`, `accent`,
`accentStrength`, `pdfShouldFail` e `forceParseError` (as duas últimas só para revisar estados).

Estado: `offset` (semitons), `capo` (0–9), `capoOpen`, `theme` (auto/light/dark) + `sysDark` do
`matchMedia`, `bias`, `fit`, `scrolling`, `mul` (velocidade), `progress`, `sheet`, `pdf`
(idle/busy/error), `toast`, `w` (largura observada por `ResizeObserver`), `fs`, `idle`.

Dados: a cifra chega como string; o parser produz `{ meta, lines }` e o agrupamento
(notas de execução, blocos de refrão) acontece depois do parse, antes do render.

## Design tokens

Escuro / Claro:

| Token | Escuro | Claro |
|---|---|---|
| `--canvas` | `#0B0D12` | `#F5F6F8` |
| `--veil` | `rgba(20,23,31,.72)` | `rgba(255,255,255,.76)` |
| `--veil-2` | `rgba(14,17,23,.86)` | `rgba(255,255,255,.92)` |
| `--line` | `rgba(255,255,255,.10)` | `rgba(19,22,29,.12)` |
| `--line-soft` | `rgba(255,255,255,.06)` | `rgba(19,22,29,.07)` |
| `--text` | `#EAECF2` | `#13161D` |
| `--lyric` | `#C4C9D4` | `#2B303B` |
| `--muted` | `#888F9E` | `#5B6270` |
| `--hover` | `rgba(255,255,255,.08)` | `rgba(19,22,29,.06)` |
| `--surface` / `--surface-hover` | `.04` / `.09` branco | `.035` / `.075` tinta |
| `--sel` / `--sel-line` | `.10` / `.22` branco | `.07` / `.20` tinta |
| `--pill` / `--pill-ink` | `#E8EAF0` / `#13161D` | `#1A1D26` / `#FFFFFF` |
| `--scrim` | `rgba(6,8,12,.55)` | `rgba(22,25,33,.38)` |
| `--danger` / `--danger-soft` | `#FF8574` / `rgba(255,133,116,.14)` | `#B02016` / `rgba(176,32,22,.08)` |
| `--focus` | `#9EB8FF` | `#2563EB` |

Acento (cor do acorde), derivado de um único RGB por tema:
`verde` → `#84DFA6` (escuro) / `#17713C` (claro); `teal` → `#6FD8E4` / `#0E6E7D`.
Derivados: `--chord-soft` .10, `--chord-edge` .30, `--chord-hover` .15, `--chord-fill` .17,
`--block` .04, `--block-line` .16, `--glow` .06 — todos multiplicados por `accentStrength`.

Sombra: escuro `0 24px 60px -18px rgba(0,0,0,.75), inset 0 1px 0 rgba(255,255,255,.07)`;
claro `0 20px 44px -20px rgba(18,23,30,.26), inset 0 1px 0 rgba(255,255,255,.7)`.

Raios: 9 (botão interno) · 11–12 (botão) · 13–15 (card/popover) · 17–18 (barra/modal).
Espaçamentos usados: 4, 6, 8, 10, 12, 14, 16, 18, 28 px.

Tipografia: **Sora** 400/500/600/700 (UI e letra) e **Space Mono** 400/700 (acordes, meta, tabs,
números). Foco: `outline: 2px solid var(--focus); outline-offset: 1–2px`.

## Assets
Nenhuma imagem. Ícones são formas CSS (triângulo por `clip-path`, quadrado, círculo) e glifos
tipográficos (`◐ ○ ● ⤢ ⤡ ↓ ▾ × − +`). Fontes vêm do Google Fonts.

## Arquivos
- `Chordpro Viewer v2.dc.html` — design de referência (versão atual).
- `Chordpro Viewer.dc.html` — versão anterior, só para histórico.
- `fixtures.js` — cifras reais usadas no protótipo (Ermelinda / Ministério Tons Set A).
- `support.js` — runtime do protótipo; **não** portar.
- `GAPS.md` — o que ainda falta implementar.
- `uploads/` do projeto — brief original (DS, telas, fixtures).
