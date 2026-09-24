# Research digest — diagramas-cifra

## Scope (from Interview)

- **Problema:** o músico precisa ver *como se toca* o acorde da cifra (violão, piano, ukulele) sem poluir a leitura da letra.
- **In:** popover no acorde; três instrumentos no ship; preferência de instrumento persistida no aparelho; BD completo de formas **no app**; ChordPro **só override**; editor de forma (personalizar / criar se o nome não for reconhecido) gravando **naquele arquivo**.
- **Out (dito):** faixa/lista de diagramas junto da cifra; dicionário default gravado no `.cho`.
- **Stakes:** dual-SoT (BD do app vs `{define}` no arquivo); toque no acorde em view vs edit; parser do dialeto BR; três visuais no mesmo ship.
- **Fontes:** `docs/VISAO.md`, `SPEC.md`, `src/core/{storage,layout,transpose,parse,import-chordpro,types,score}.ts`, `src/vue/{ChordproViewer,chart/ChartBody,edit/ChordDialog}.vue`, `projects/titan-chordpro-ui/editor/design.md`, `fixtures/sda/`.

Defaults tomados após o widget de follow-up ter sido recusado: BD no **pacote** `titan-chordpro-ui` (core); criar/personalizar escreve **só** naquele `.cho`, não no BD global.

## Findings

- **`docs/VISAO.md` §1 / §3 e `SPEC.md` §2:** diagramas de braço estão marcados *later* / non-goal v0.1. O pacote já está em `0.4.0` (`package.json`). A feature é MINOR, não entra no v0.1. verified_by: `docs/VISAO.md` L15, L55; `SPEC.md` L51; `package.json` L3.

- **`README.md`:** fora explícito (“diagramas de braço”). Dual capo já explica o job: teclado/baixo/voz leem o tom real; violão lê a forma. verified_by: `README.md` L22, L48.

- **`src/core/transpose.ts`:** o token é opaco salvo a **raiz**. `C7M(9)` transposto vira `D7M(9)`; sufixo BR sobrevive. Não há `qual` / `ext` / `bass`. Lookup de forma **não existe**. verified_by: `transposeToken` L32–42; `nashvilleToken` L110–120.

- **`src/core/layout.ts` `display()`:** view mostra (a) nome concert transposto, (b) **shape** com capo, (c) grau Nashville. Edit e Nashville **zeram** capo. `lens=letra` apaga acordes, legend e pares. Qualquer popover tem de lookup **depois** desta projeção — e falhar em `letra`. verified_by: L457–477, L509–543.

- **`CapoLegend.pairs`:** já lista acordes únicos em ordem de aparição — mas a Interview **proibiu** faixa-legenda. O tipo continua útil para o editor (“vocabulário da cifra”), não para a leitura. verified_by: `src/core/types.ts` L192–199; `layout.ts` L509–535.

- **Leitura: acorde não é clicável.** `ChartBody.vue` desenha `.cpv-chord` como `<span>`. Toque em view não abre nada. Em edit, o acorde vira pill arrastável / `ChordDialog` (nome + vocabulário da cifra, sem forma). verified_by: `src/vue/chart/ChartBody.vue` L437–445; `src/vue/edit/ChordDialog.vue` L1–86.

- **`{define}` hoje some.** `GAPS.md`: diretivas não suportadas (`{define}`, `{chord}`, …) caem em meta e desaparecem. `META_KEYS` **não** inclui `define`. `writeMeta` só reescreve chaves conhecidas; uma linha `{define: …}` no corpo **sobrevive** ao rewrite de header *se* o parser a deixar no body — mas `readMeta` ignora, e o parse de diretiva `DIR` trata `{define:…}` como diretiva genérica, não como override de forma. verified_by: `design-source/design_handoff_chordpro_viewer/GAPS.md` L34–35; `src/core/import-chordpro.ts` L344–357, L425–437; `src/core/parse.ts` L28 (`DIR`).

- **Padrão irmão `{x_strum:}`:** batida **não** usa ChordPro oficial; usa chave Titan em `META_KEYS`, parse próprio, folha `BatidaSheet`, strip de leitura. Override de diagrama *pode* copiar esse padrão (`{x_chord:}`) **ou** aderir a `{define}` oficial. Os dois brigam com “ChordPro só override”. verified_by: `src/core/import-chordpro.ts` L348–356, L382–419; `projects/titan-chordpro-ui/batida-editor/design.md` Decision 1.

- **Prefs / store:** `STORE_KEYS.prefs` (`cpv:prefs`) já persiste tema, bias, fit, metrônomo, `lens`, `hideComments` via `ChartStore` (default `localStorage`, host pode trocar). Instrumento de diagrama **não** existe. `lens` “sobrevive song changes and remounts”. Mesmo seam para o instrumento. verified_by: `src/core/storage.ts` L16–51, L24–38; `src/vue/ChordproViewer.vue` L1119–1141.

- **`score.ts` / `ScoreEditor`:** `entry: 'guitar' | 'piano'` é **partitura/TAB de melodia** (VexFlow), não diagrama de acorde. `STR_MIDI` / `toTab` mapeiam nota → casa. Reusar como dicionário de cifra mente. verified_by: `src/core/score.ts` L1–74; `src/vue/edit/ScoreEditor.vue` L28–47.

- **Core sem Vue:** A14 / `tests/core/no-vue-in-core.test.ts`. Dicionário, parser de nome, modelo de diagrama e resolução override→BD cabem no core. SVG / popover / editor visual cabem no Vue. verified_by: `tests/core/no-vue-in-core.test.ts` L19–27; `docs/VISAO.md` stack.

- **Corpus `fixtures/sda/` (148 `.cho`):** 13 637 tokens, **257 nomes únicos**; únicos/música mediana 10, p90 19, máx 31. Dialeto BR: `7M`, `7M(9)`, `4`, `sus`, `7+`, `9`, slash `G/B` `C/E` `D/F#`, lixo de fonte (`A4"`, `m7'''`). Sem `{define}` no corpus. verified_by: inventário 2026-09-18 sobre `fixtures/sda/*.cho`.

- **Editor Source-SoT:** patches in-place escrevem no source não-transposto; ao entrar em edit, transposição reseta. Uma forma gravada tem de referenciar o **nome escrito**, não o display. verified_by: `projects/titan-chordpro-ui/editor/design.md` Decision 1, 5b.

- **Auto-rolagem:** relógio é duração do fixture + `x///`, nunca palpite de linha. Popover overlay **não** muda `contentHeight`. Faixa no fluxo mudaria — e está fora. verified_by: `SPEC.md` §4.7; `docs/MARCAS-X.md`; Interview “somente popover”.

## Open risks / seams

1. **Lookup key.** Display (capo/nashville/transpose) ≠ source. Override `{define: C7M}` no arquivo escrito em G não casa com `D7M` após +2. Resolver: lookup pelo **nome exibido** contra BD transposto, override pelo **nome escrito** + transpose do define — ou gravar define já no display (proibido pelo editor 5b).
2. **`{define}` vs `{x_chord:}`.** Oficial é o que o usuário disse (“no ChordPro só override”). `writeMeta` / `DIR` hoje não modelam `define`. Batida escolheu chave Titan porque o oficial não cabia. Mesma tensão.
3. **Toque view vs edit.** View precisa de hit-target no `.cpv-chord`. Edit já usa o acorde para rename/drag. Popover em edit compete com `ChordDialog`.
4. **Três visuais.** Violão/ukulele = grade; piano = teclado. `ScoreEditor` já tem guitar|piano mas é outro domínio. Shipar os três no v1 sem parser BR honesto mente em `C7M` / slash.
5. **Acorde não reconhecido em view.** Interview só descreveu o editor. Leitura: silêncio, “sem forma”, ou empurrar para edit?
6. **Instrumento no arquivo vs prefs.** Interview: preferência no aparelho, não no `.cho`. `{define-guitar:}` / `{define-ukulele:}` ainda fazem sentido como *override por instrumento naquele arquivo*, sem escolher o instrumento ativo.
7. **Host store.** “localStorage” no pacote = `ChartStore` (`browserStore`). Host SDA pode injetar outra persistência. Não chamar `localStorage` direto no Vue.
