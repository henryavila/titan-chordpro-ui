# Design — refatoração de qualidade (`titan-chordpro-ui`)

## Interview

| Campo | Ratificado |
|---|---|
| **Problema** | UI repetida, CSS/JS solto, lógica espalhada, risco de drift. |
| **In-scope** | Repo inteiro. Componentes reutilizáveis, dicionário, DRY, coesão. Migração **completa** no plano, entrega por PRs. Canônicos de UI: recomendações do agente, validação do usuário **no final**. Pacotes de docs + gerador. |
| **Out** | Mudar o que a cifra *faz*. Unificar wrap PDF/CSS/slides. Unificar `beatsPerBar` 6/8. Fundir OnSong silencioso/import. “Consertar” filename vazio. Ligar a Vue no `createTitanChordproController`. TypeDoc como guia do host. |
| **Done-when (design)** | Este doc + `decisions.md` com todas as famílias. Implementação: testes verdes + relatório opções×escolha. |
| **Stakes** | Props/emits de `<TitanChordpro>`; barrels `"."` `./vue` `./pdf` `./slides` `./bundle`; CSS/DOM `titan-chordpro-*`; `data-*`; `STORE_KEYS`; `x_titan_*`; `x///`; `{duration:}` na rolagem; Vue fora de `src/core`. |
| **Fontes** | SPEC, VISAO, NAMING, CONSUMER, `src/`, `tests/`, digest em `research-digest.md`. |

## Context

`TitanChordpro.vue` tem 3768 linhas (script 3053). O markup já está em ~30 SFCs; o peso é orquestração. PhoneDock e WideDock duplicam Rolar, A±, Ajuste, setlist. Sheets e dialogs copiam casca, kicker, close, stepper, chip. CSS 3591 linhas, `bar-btn` sem regra base. Core tem gods (`import-chordpro.ts` 1338) e duplicações reais (OnSong, DIR, walker TAB/score) ao lado de especializações que **não** se unem (`beatsPerBar`, wrap).

Testes caracterizam arquivo-fonte (`metronome-pulse.test.ts` lê `TitanChordpro.vue`) e estilo **inline** do Rolar (`dock-play.test.ts`). Extração e teste andam no mesmo PR.

## Decisions

1. **Strangler, plano completo.** Ondas no fim deste doc. Nada de reescrever a UI num design system novo.
2. **Um componente por tipo de UI.** Duplicata → canônico em `decisions.md`. Densidade 44/36 é prop, não segunda peça.
3. **Dicionário** em `src/vue/ui/` + catálogo HTML (Tailscale no lab).
4. **Não fundir PhoneDock + WideDock** no v1. Eles passam a *usar* as peças.
5. **Bind objects** no pai (padrão `viewHeadBind`) para secar o drill.
6. **Core: fatiar arquivos, não fundir semânticas.** Walker de `{sot}`/`x_titan_start_of_score` compartilhado; OnSong fica dois caminhos nesta leva.
7. **Docs:** pacote por feature; gerador quando ≥3. CHANGELOG continua manual (português de pessoa).
8. **Canônicos de UI:** tabela em `decisions.md`. Usuário valida no relatório final.

## Chosen approach

**1A — extração incremental com mapa da migração inteira, dicionário de componentes, canônicos gravados, gerador de docs depois do terceiro pacote.**

Rejeitado: (B) reescrita visual big-bang; (C) começar pelo core fundindo parsers; docs só TypeDoc; docs só convenção sem gerador (fica etapa 0 até o 3º pacote).

## Non-goals

- Mudar relógio `x///`, `{duration:}`, Só letra, `x_titan_*`.
- Vue em `src/core`.
- Unificar `renderHtml` com ChartBody.
- Unificar measure PDF/slides/tela.
- Alias `cpv-*` / `ChordproViewer`.

## Blast radius

- Host SDA: props/emits/CSS/`data-*` estáveis. Classes novas são **adição** (`titan-chordpro-roll`, `is-live`).
- Testes de grep de arquivo: se o pulso sair de `TitanChordpro.vue`, o teste migra no mesmo PR.
- `dock-play` deixa de exigir `style="background: var(--chord)"` e passa a classe + computed, no mesmo PR.
- `.edp*` → `titan-chordpro-edp-*` é rename CSS interno do editor de partitura.

## Rejected alternatives

- Um SFC `ChromeDock` com `variant` no lugar de átomos — vira outro god.
- Unificar 6/8 da rolagem com o da partitura.
- Gerar CONSUMER a partir de JSDoc.
- Ligar a Vue no controller nesta leva.

## Open questions

Nenhuma de produto. Validação dos canônicos é o relatório pós-implementação.

## Ondas de implementação

1. CSS base (`bar-btn`, `roll`, ghost sizes) + `RollButton` `TypePair` `BarButton` `IconButton` nos docks.
2. SetlistNav, SpeedHud, FitHint, DualSwitch, tokens do Mais, fila um caminho.
3. DialogShell, Kicker, ActionButton, Chip, Stepper, SwitchRow, ChartIdentityFields.
4. Bind objects + `useExport` `useChromeLayout` no SFC.
5. Partir `useOverlay` / `useBlockEdit`.
6. `useAutoScroll` / `useEditSession` (por último).
7. Core: fatiar `import-chordpro`, walker de região.
8. Demo HTML único, `v-bind` CifraDemo, zip interno.
9. Pacotes `docs/features` + `docs:build`.

## Self-review against code-quality gates

- G1 read-before-claim: applied — census e duplicatas citadas no `research-digest.md` (`TitanChordpro.vue` 3768, docks, `bar-btn` só hover em `titan-chordpro.css:1432`).
- G2 soft-language: applied — decisões são imperativas.
- G6 reference-or-strike: applied — canônicos em `decisions.md`; “não unificar” aponta arquivos do digest.
