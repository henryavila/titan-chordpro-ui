# Handoff — refatoração de qualidade

Continuar nesta branch, **não** em `main`.

| | |
|---|---|
| Branch | `refactor/qualidade-codigo` |
| Worktree | `/home/henry/titan-chordpro-ui/.worktrees/qualidade-codigo` |
| Checkout | `git worktree add .worktrees/qualidade-codigo refactor/qualidade-codigo` (se o worktree não existir) |
| `node_modules` | symlink `ln -sfn ../../node_modules .worktrees/qualidade-codigo/node_modules` |
| Vitest no worktree | `vitest.config.ts` já libera `../../node_modules` (fonte AlphaTab fora da raiz) |

## O que o usuário pediu

- Refatoração **completa** do repo, qualidade de código, **sem mudar o que a cifra faz**.
- Plano cobre a migração inteira; entrega por PRs.
- Componentes para tudo; dicionário organizado.
- Canônicos de UI: **aceitar todas as recomendações**; **não** perguntar item a item.
- No **final**, depois de implementar tudo, mostrar relatório opções × escolha para validar.
- Docs: pacote por feature + gerador depois de ≥3 pacotes.

## Arquivos de desenho

- `projects/titan-chordpro-ui/qualidade-codigo/decisions.md` — tabela canônicos (opções × escolha)
- `projects/titan-chordpro-ui/qualidade-codigo/design.md` — design 1A
- `projects/titan-chordpro-ui/qualidade-codigo/research-digest.md` — evidência
- `docs/features/chrome-botoes.md` — primeiro pacote de docs

## Feito nesta branch

Peças em `src/vue/ui/`:

- `TitanChordproRollButton`, `TypePair`, `BarButton`, `IconButton`
- `FitHint`, `SpeedHud`, `SetlistNav`, `SwitchRow`, `DialogShell`
- `Chip`, `Stepper` (`lg`/`md`/`sm`), `ActionButton`, `ListRow`, `ChartIdentityFields`

Ligados em PhoneDock, WideDock, EditDock, MoreSheet, ViewHead, ToneSheet, ExportSheet, MyVersionPanel, UpdateDialog, MetaDialog, NewChartDialog, SetlistSheet, SuggestionQueue.

Também: `audioRefBind` e os binds `viewHeadBind`, `wideDockBind`, `phoneDockBind`, `editHeadBind`, `editDockBind`, `moreSheetBind`; `useExport`, `useChromeLayout`, `useNotationPrefs`. Fila no telefone só no Mais; Graus no Mais; ícone de comentários `eye`/`eyeOff`; CSS base de `bar-btn` / `roll`.

Onda seguinte, neste branch:

- `useOverlay` ficou com o estado; fila, gravação, minha versão e o diálogo de atualização estão em `src/vue/use/overlay/`. O import continua `use/useOverlay`.
- `useBlockEdit` ficou com os refs; gestos, comandos, seleção, sessão e a linha estão em `src/vue/use/block-edit/`. O import continua `use/useBlockEdit`.
- `import-chordpro.ts` é barrel. O corpo está em `src/core/import/` (`plain`, `meta`, `key-rewrite`, `cifraclub`, `convert`). `notationEdge` em `src/core/notation-region.ts` só classifica a chave de tab e partitura. OnSong silencioso e o de import continuam dois.
- Demo: `demo/boot-html.ts` repete fontes e o shell de abertura. O HTML expandido das seis páginas é o mesmo de antes. `CifraDemo` usa `chartBind` / `chartOn`; `theme-control="host"` só no site. Zip de produção não foi unido (`src/slides/zip.ts` escreve, `src/bundle/unzip.ts` abre).
- `docs/features/exportacao.md` é o terceiro pacote. `pnpm docs:build` e `pnpm docs:check` só reescrevem o índice entre `<!-- titan-features:start -->` e `<!-- titan-features:end -->` no README e no CONSUMER.
- `useAutoScroll` é o relógio da página (`raf`, `swipePeekHold`, subpixel, timeline). `useEditSession` é a sessão em volta de `createSourceSession` e o único dono de `lastSrc`. O pulso do metrônomo continua em `TitanChordpro.vue`.

Vue + timeline + a trava de estimativa da rolagem: **668 testes** verdes depois da extração do relógio. `vue-tsc --noEmit` passou. Não houve verificação no navegador.

## Falta (ondas)

1. ~~Chip, Stepper, ChartIdentityFields (Meta/Nova), ActionButton, ListRow~~ feito
2. ~~Bind objects dos docks (como `viewHeadBind`)~~ feito — tipos em `src/vue/chrome/dock-model.ts`
3. ~~`useExport`, `useChromeLayout`, `useNotationPrefs`, `useAutoScroll`, `useEditSession`~~ feito. `lastSrc` só na sessão; `raf` da rolagem e `swipePeekHold` só no relógio
4. ~~Partir `useOverlay` / `useBlockEdit`~~ feito
5. ~~Core: fatiar `import-chordpro.ts`; classificador `{sot}` / `x_titan_start_of_score`~~ feito. Não unificar `beatsPerBar` 6/8 nem wrap PDF/CSS/slides
6. ~~Demo HTML / `CifraDemo` bind~~ feito. Zip interno já eram dois papéis
7. ~~`docs:build` a partir de `docs/features/`~~ feito
8. ~~Relatório opções × escolha~~ entregue na conversa, a partir de `decisions.md`. O usuário aprovou. O Rolar parado fica pintado na cor do acorde.

## Não fazer

- Vue em `src/core`
- Fundir PhoneDock+WideDock num SFC só
- Unificar `beatsPerBar` rolagem vs partitura
- Unificar `renderHtml` com ChartBody
- “Consertar” filename com título vazio
- Commitar `package-lock.json` ou `node_modules`

## Testes

```sh
cd /home/henry/titan-chordpro-ui/.worktrees/qualidade-codigo
./node_modules/.bin/vitest run tests/vue
```

Testes que liam `style="background: var(--chord)"` no Rolar agora checam a classe `titan-chordpro-roll`.
