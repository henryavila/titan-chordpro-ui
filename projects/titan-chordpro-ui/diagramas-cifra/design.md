# Design — Diagramas de cifra (violão, piano, ukulele)

> **Aprovado** (usuário, 2026-09-18) · critic Approved · síntese do debate (Priya / Aria / Uma / Tariq-contrário) + capo no draw.  
> Paths: `projects/titan-chordpro-ui/diagramas-cifra/` · digest: `research-digest.md`.

## Interview

| Campo | Decisão ratificada (B0 + B2) |
|---|---|
| **Problema** | O músico precisa ver *como se toca* o acorde da cifra (violão, piano, ukulele) sem poluir a leitura da letra. |
| **In-scope** | Modal de forma no acorde (sem faixa/lista junto da cifra); três instrumentos no ship; preferência de instrumento persistida no aparelho (próxima cifra abre o mesmo); BD completo de formas no pacote; ChordPro **só override**; editor de forma (personalizar / criar se o nome não for reconhecido) gravando **naquele arquivo**. |
| **Out-of-scope** | Faixa ou lista de diagramas junto da cifra; dicionário default gravado no `.cho`; BD global do aparelho além do pacote. |
| **Done-when (design)** | Este doc: decisões + abordagem; critic Approved; aprovação explícita do usuário. Não é a implementação. |
| **Stakes** | Dual-SoT (BD do pacote vs `{define}` no arquivo); toque view vs edit; parser do dialeto BR; três visuais no mesmo ship; draw com capo. |
| **Fontes** | `docs/VISAO.md`, `SPEC.md`, `src/core/{storage,layout,transpose,parse,import-chordpro,types,score}.ts`, `src/vue/{ChordproViewer,chart/ChartBody,edit/ChordDialog}.vue`, `projects/titan-chordpro-ui/editor/design.md`, `fixtures/sda/`. |

Defaults após widget recusado: BD no **core** de `titan-chordpro-ui`; criar/personalizar escreve **só** naquele `.cho`.

## Context

- VISAO/SPEC/README marcam diagramas de braço como *later*. O pacote está em `0.4.0`. Feature = **MINOR**. verified_by: `docs/VISAO.md` L15, L55; `SPEC.md` L51; `package.json` L3.
- `transposeToken` move só a raiz; sufixos BR (`7M`, `4`, `7+`) são opacos. verified_by: `src/core/transpose.ts` L32–42.
- `layout.ts` `display()` já separa concert (`name`) e **shape** de capo; Nashville zera shape; `lens=letra` apaga acordes. verified_by: `src/core/layout.ts` L467–477, L538–543.
- Capo **sem** dual reescreve a cifra para as formas; capo **com** dual empilha shape cinza sobre concert verde. verified_by: `src/core/layout.ts` L438–442, L473–476; `README.md` L22.
- View: `.cpv-chord` é `<span>` inerte. Edit: `ChordDialog` edita o **nome**. verified_by: `src/vue/chart/ChartBody.vue` L437–445; `src/vue/edit/ChordDialog.vue`.
- `{define}` é diretiva ignorada (GAPS). `META_KEYS` não a inclui. verified_by: `design-source/design_handoff_chordpro_viewer/GAPS.md` L34–35; `src/core/import-chordpro.ts` L344–357.
- Prefs já persistem em `STORE_KEYS.prefs` via `ChartStore` (default `localStorage`; host injeta). `lens` sobrevive troca de música. verified_by: `src/core/storage.ts` L24–51; `src/vue/ChordproViewer.vue` L1137–1139.
- `score.ts` guitar/piano = partitura/TAB de **melodia**, não diagrama de acorde. verified_by: `src/core/score.ts` L1–74.
- Corpus `fixtures/sda/`: 148 `.cho`, 257 nomes únicos. Sem `{define}`.
- Editor Source-SoT: ao entrar em `edit`, transposição reseta; patches no source escrito. verified_by: `projects/titan-chordpro-ui/editor/design.md` Decision 1, 5b.

## Decisions

1. **Modal de forma, não popover no acorde.** Nenhum grid, faixa ou lista de diagramas no fluxo da cifra. Tap no acorde abre um **modal overlay** (não reflow da cifra; altura de `[data-cpv-scroll]` inalterada; o overlay não entra no relógio de `{duration:}` / `x///`). **Celular/tablet:** tela cheia (`100dvh` do viewer). **Desktop:** modal largo que ocupa a maior parte da superfície da cifra (não um card de 320px). Fechar: botão Fechar / Escape / scrim no desktop. **Tap pausa auto-rolagem e metrônomo** até o modal fechar; ao fechar, os dois retomam. Sem rolagem/metrônomo, o tap só abre o modal.

2. **Três instrumentos no ship:** `guitar` (violão, EADGBE), `ukulele` (**GCEA** soprano/concert, nomeado), `piano` (teclado, `keys` relativos à tônica). Primeira visita: **`guitar` silencioso**. Quem não é violão troca **no modal** (alvos grandes). A escolha grava. Barítono (DGBE) fica fora.

3. **Instrumento = preferência do músico, não da cifra.** Persiste em `STORE_KEYS.prefs` (chave `diagramInstrument`) pelo `ChartStore` — **não** `localStorage` direto no Vue. Sobrevive troca de música e remount, no mesmo seam de `lens`. **A casa da seleção é o modal de forma** (violão / piano / ukulele, diagrama troca no sítio). Fora do ToneSheet. Fora do menu Mais — um só lugar para escolher instrumento.

4. **BD completo no core do pacote.** Vue não escolhe forma. Host não traz dicionário. `{define}` no `.cho` é **só override** daquele arquivo. Criar/personalizar **não** altera o BD global.

5. **Layout expõe três campos por acorde, preenchidos *antes* de dual/Nashville.** Hoje `display()` no capo-solo devolve `{ name: shape, shape: '' }` e descarta o concert; `shapeCapo` só é o fret quando dual está on. verified_by: `src/core/layout.ts` L467–476, L489. Isso não alimenta piano nem o draw de capo. Cada seg tocável passa a carregar:
   - `concert` — nome concert pós-transpose  
   - `shapeName` — nome da forma da mão (`transposeToken(source, semis - capoFret)`); igual a `concert` se `capoFret === 0`  
   - `capoFret` — fret do bloco (`capoReadOf`, song ou `#capo:n`); `0` = nut  
   Vue **não** reimplementa `capoReadOf`. Nashville só troca o **rótulo** na cifra; os três campos permanecem. Modal: diagrama grande + **nome que se toca** (`Am`, não `6m`). `lens=letra`: sem modal. `edit` continua zerando capo na **projeção de edição** (editor 5b); a folha de forma lê `capoFret` do **view** do bloco / meta `{capo:}` do source, não do `display()` de edit.

6. **Lookup + override = o que se desenha, não o nome da letra.**  
   - Violão/ukulele: token e chave de `{define}` / `{define-guitar}` = **`shapeName`**. Matcher = parse BR (`7M`→maj7, `4`/`sus`→sus4, `9`→add9, `2`→sus2). Rótulo na UI = grafia da tela (`C9`, não `Cadd9`). `7+` e lixo de aspas continuam miss.  
   - Piano: token e chave de `{define}` / `keys` = **`concert`**. Capo não entra no lookup nem no draw.  
   - Folha de forma com capo: o músico edita o diagrama da **mão** (Am com capo 2, letra `[Bm]`). Grava `{define-guitar: Am …}` — o nome do define é o da shape, não o da letra. Piano grava `{define: Bm keys …}`. A letra `[Bm]` não muda.  
   - `{define}` **não** anda com transpose: `{define-guitar: Am}` só casa quando `shapeName` é Am. O BD default anda com o token tocável.  
   - Proibido: lookup pela shape e storage pelo nome escrito da letra (Bm) — o override nunca casaria. verified_by: critic F-001.

7. **Draw com capo (emenda B2 do usuário).** O desenho **não** é só o lookup do nome. Com `capoFret > 0`:
   - **Violão / ukulele:** desenha a **forma da mão** (`shapeName`), **e** marca o capo com **barra no traste + rótulo `Capo n`**. Casa `0` no shape = corda soando no capo, não no nut. Dedos 1–4 quando o BD/`fingers` tiver; senão só pontos. Não desenhar o voicing concert (capo 2 + shape Am **não** vira diagrama de Bm). Vale dual **e** capo-solo: `capoFret` vem do campo do seg, não de `shapeCapo` (que é 0 no solo).  
   - **Piano:** teclas **concert**. Sem barra de capo.  
   - Capo dual: **um** hit-target na pilha. Violão/ukulele → shape + capo no draw. Piano → concert. Legenda no modal de cordas: “soa {concert}”.

8. **Override = `{define}` ChordPro oficial.** `{define: Nome base-fret N frets … fingers …}`, `{define-guitar:}`, `{define-ukulele:}`, `{define: Nome keys 0 4 7}`. Sem `{x_chord:}`. Sem `{instrument}` obrigatório no arquivo. `{define:}` genérico (sem sufixo) infere o instrumento do payload: `keys` → piano; 6 casas → guitar; 4 casas → ukulele; senão miss. Preferir `{define-guitar:}` / `{define-ukulele:}` quando o arquivo mistura. Parser e writer **redondam** `{define}` (hoje dropam — GAPS). Não entra em `META_KEYS` de `x_`; é diretiva de documento. `DIR` hoje é `[a-zA-Z_]+` — `{define-guitar:}` casa `k=define` e come o hífen. verified_by: `src/core/parse.ts` L28. D1 alarga o matcher para `define`, `define-guitar`, `define-ukulele`. Colocação: bloco de `{define…}` imediatamente após o header `META_KEYS`, antes da primeira linha de letra; `writeDefines` próprio, não `writeMeta`. Gate: round-trip + fixture **antes** da UI gravar.

9. **Resolução, nesta ordem:** parse do token tocável (`shapeName` nas cordas, `concert` no piano) → override do documento (mesmo instrumento + nome do define igual ao token **ou** mesmo canônico) → dicionário do pacote `(instrument, canonical)` → miss. `capoFret` **não** participa do match do override; entra só no **draw** depois do hit. Core puro: `parseChordToken`, `resolveDiagram({ token, instrument, overrides })`, `parseDefineDirective` / `serializeDefine`. Sem Vue. Sem `localStorage`.

10. **Miss no view:** o acorde **é** clicável. Modal liga **mesmo com cobertura parcial** — “Sem forma neste instrumento” + seletor de instrumento (muitas vezes o miss é o instrumento errado). Sem limiar % para D3. Sem CTA “criar” no ensaio. Criar/personalizar só em `mode=edit`. Token `UNPARSED` / `7+` ambíguo / aspas de lixo (`A4"`) = miss, não chute.

11. **Editor de forma = o mesmo modal, modo edit.** ChordDialog ganha ação secundária **Forma**, que abre o **mesmo** modal grande com a grelha gravável. View: ler + trocar instrumento. Edit: + gravar `{define}` / `{define-guitar}` cujo **nome é o token tocável** (`shapeName` nas cordas, `concert` no piano), source não transposto. Nome ausente no BD = grelha vazia + criar neste arquivo. View **não** oferece personalizar.

12. **Qualidade (dissent Tariq, sem reabrir locks).** Oráculo dos 257 nomes de `fixtures/sda` (token → parse | UNPARSED | AMBIGUOUS → hit/miss por instrumento) **antes** de chamar o BD de completo. Piano = renderer de teclado, não fretboard pintado. Testes de tap vs swipe de setlist, auto-scroll e `lens=letra`. Teste verde que só usa `C`/`G`/`Am` não fecha o gate.

13. **Sem Vue no core.** SVG, modal, seletor de instrumento = Vue. Dicionário, parse, resolve, `{define}` = core. A14 permanece.

14. **Host: capability `diagrams`, default on.** Prop/flag no embed (`ViewerCapabilities.diagrams`, default `true`). SDA pode desligar no dia 1. Ausência da prop = ligado. Não é default off.

### Gates de entrega

| Gate | Capacidade | Aceite |
|---|---|---|
| **D0** | Parser BR + oráculo 257 | Tabela no repo; `7+`/lixo = AMBIGUOUS/UNPARSED; zero chute |
| **D1** | `{define}` parse/serialize/round-trip | Matcher aceita `define-guitar` / `define-ukulele`; fixture com define; `writeMeta` não apaga; exportCho preserva |
| **D2** | `resolveDiagram` + BD + draw com capo | Segs com `concert` / `shapeName` / `capoFret`; transpose; capo dual **e** solo (marca no SVG); block capo; piano lookup/draw = concert |
| **D3** | Modal view + prefs de instrumento | Sem lista; `letra` sem modal; persistência entre cifras; phone/tablet 100dvh; desktop largo; seletor no modal; tap **pausa** rolagem+metrônomo até fechar; `diagrams` default on |
| **D4** | Folha editor + criar/personalizar no `.cho` | Letra intacta; `{define-guitar: Am}` com capo 2 + letra `[Bm]`; piano `{define: Bm keys …}`; BD global intacto |

D4 não abre na UI antes de D1 verde.

## Chosen approach

**Abordagem escolhida: BD no core + `{define}` só override + modal grande de ensaio (seletor de instrumento nessa tela) + o mesmo modal gravável no edit + draw da shape com capo.**

Peso do debate (2026-09-18):

- **Priya:** o ensaio lê a tela; `{define}` oficial (batida inventou `x_strum` porque o padrão não tinha batida; forma **tem**); criar é job de edit.
- **Aria:** core chato; token B + chave C; `{define}` é documento; API `resolveDiagram`; Vue nunca chama `localStorage`.
- **Uma:** um hit-target no dual; cordas = shape, piano = concert; seletor no modal grande; view sem personalizar.
- **Tariq (contrário):** oráculo 257; parser DROP bloqueia override; editor fora do MINOR; miss silencioso; 3 instrumentos juntos = dívida.

**Resolução B2 (usuário):** locks de produto intactos (3 instrumentos, editor neste desenho, sem lista na cifra). Tariq vira **gates D0–D1**, não recorte. Emenda capo: **o draw considera o capo.** Emenda superfície (2026-09-19): **modal grande, não popover; seletor de instrumento nessa tela.**

```
token tocável (shape se cordas+capo; concert se piano)
    → parseChordToken
    → override {define} deste .cho
    → BD do pacote
    → draw(shape, capoFret)     ← capo entra no SVG, não só no nome
```

## Rejected alternatives

| Alternativa | Por que rejeitada | Quem |
|---|---|---|
| Faixa/lista de diagramas junto da cifra | Polui leitura; p90=19 únicos; lock do usuário | User B2, Uma |
| Lookup pelo nome escrito no source | Capo/transpose: o músico toca o que vê; shape Am com capo 2 não é diagrama de G | Priya, Uma, emenda capo |
| Lookup string crua sem parse BR | Metade do hinário (`7M`, `4`) vira miss falso | Priya, Aria |
| `{x_chord:}` estilo `{x_strum:}` | Forma já tem diretiva oficial; segundo dialeto mente no export | Priya, Aria |
| Empilhar o braço no ChordDialog | ChordDialog edita nome; grelha não cabe no polegar | Uma, Priya |
| CTA “criar forma” no modal de view | Edit zera transpose; ensaio vira authoring | Priya, Uma |
| Popover pequeno âncora no acorde | Braço, teclado e 3 instrumentos não cabem; user 2026-09-19 | User |
| Acorde inerte quando miss | Parece tap partido | Uma, Priya |
| Instrumento no `.cho` / ToneSheet / Mais | Banda mista; tom ≠ instrumento; um só lugar = o modal | User lock, Uma, emenda 2026-09-19 |
| Gravar override no tom transposto | Corrompe o source (editor 5b) | Aria, editor design |
| Draw concert no violão com capo | Mão finge Am, diagrama Bm — acorde errado no palco | User B2 emenda, Uma |
| Lookup pela shape e `{define}` no nome da letra (`Bm`) | Override nunca casa no capo; personalizar no `.cho` vira no-op | Critic F-001 |
| `{define: Bm}` com frets da shape Am (match pelo escrito, draw relativo ao capo) | Sem capo, Bm mostra voicing de Am; o arquivo mente | Critic F-001 opção B |
| Ukulele sem afinação / barítono silencioso | GCEA ≠ DGBE | Tariq |
| Chutar `7+` para aug ou maj7 | Ambíguo no corpus | Tariq |
| Editor de formas fora deste MINOR | User lock: editor neste desenho; contenção = D1 antes de D4 | User vs Tariq |
| Raspar formas do Cifra Club | Enrich já recusou o corpo do CC | Context / VISAO |
| Reusar `score.ts` `toTab` como dicionário | Melodia → casa, não voicing de cifra | Context |
| Esperar limiar % para ligar o popover | User: miss honesto > feature desligada | Lote 2 |
| Perguntar instrumento na 1ª cifra | Atrasa o culto; default violão silencioso | Lote 2 |
| Rolagem continua com popover aberto | User: tap pausa até fechar | Lote 2 |
| Flag `diagrams` default off | Cutover esconde a feature; default on | Lote 2 |

## Blast radius

| One-way door | Contenção |
|---|---|
| `{define}` passa a ser SoT de override | D1 verde (round-trip + fixture) **antes** de D4 escrever; `writeMeta` não apaga define; exportCho preserva |
| Prefs `diagramInstrument` | Aditivo em `cpv:prefs`; host ChartStore já existe; ausência = `guitar` |
| Extensão de `ChartSeg`: `concert`, `shapeName`, `capoFret` | Preenchidos em `capoReadOf` **antes** de dual/Nashville; Vue não reimplementa capo; `shapeCapo` legado não é a fonte do draw |
| BD versionado no pacote | MIT de origem (ex. chords-db) + suplemento BR; miss explícito > chute; oráculo SDA no repo |
| Três renderers no mesmo MINOR | Dois primitivos (frets vs keys); testes separados; ukulele = GCEA nomeado |
| Hit-target em todo acorde (view) | Overlay; teste vs swipe/setlist/auto-scroll/`letra`; sem reflow |

## Non-goals

- Faixa, grid ou lista de diagramas no corpo da cifra.
- Dicionário default serializado no `.cho`.
- BD pessoal do aparelho (além do pacote) ou “salvar forma para todas as cifras”.
- `{instrument}` obrigatório no arquivo.
- Ukulele barítono / drop-D / afinações alternativas.
- Dedilhado de piano (mão esquerda/direita); só teclas acesas.
- Alternates de voicing no v1 (uma forma por nome: a mais aberta / mais baixa).
- PDF com diagramas (jsPDF hoje não pinta este SVG).
- Diagrama inline sob cada sílaba.
- Partitura VexFlow como diagrama de acorde.
- Cifra Club como SoT de forma.
- VisualAdapter / binding React.
- Inventar fixtures de cifra (usar `fixtures/sda`; `{define}` de teste = fixture **nova** de diretiva, não uma letra inventada).
- Diretiva `{chord:}` no corpo da cifra (diagrama inline no fluxo) — o lock é modal overlay, não lista.

## Open questions

Nenhuma em aberto após o lote de decisões 2026-09-18.

| # | Fechado |
|---|---|
| 1 | Modal liga mesmo com miss; oráculo D0 continua obrigatório, sem limiar % para D3 |
| 2 | Nashville: diagrama + nome que se toca |
| 3 | Capability `diagrams` no embed, **default on** |
| 4 | Capo: barra no traste + rótulo `Capo n` |
| 5 | Tap **pausa rolagem + metrônomo**; ao fechar, os dois retomam |
| 6 | Primeira visita = violão silencioso |
| 7 | `9`→add9, `2`→sus2; `7+` continua miss |
| 8 | Dedos 1–4 no v1 quando o BD tiver `fingers` |
| 9 | Superfície = **modal grande** (phone/tablet 100dvh; desktop largo); seletor de instrumento nessa tela, não no Mais |

## Self-review against code-quality gates

- G1 read-before-claim: applied — `display()` capo/shape, `STORE_KEYS.prefs`, GAPS `{define}`, ChordDialog nome-only, `META_KEYS`, `score.ts` melodia, editor 5b, cada um com path em Context.
- G2 soft-language: applied — Decisions em imperativo (“desenha a forma da mão”, “não anda com transpose”, “sem CTA”); 0 “talvez/idealmente” nas Decisions.
- G6 reference-or-strike: applied — asserts de repo com `verified_by`; Open questions marcadas como não resolvidas.
