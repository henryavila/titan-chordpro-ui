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

Vue: **629 testes** (`pnpm exec vitest run tests/vue`).

## Falta (ondas)

1. ~~Chip, Stepper, ChartIdentityFields (Meta/Nova), ActionButton, ListRow~~ feito
2. ~~Bind objects dos docks (como `viewHeadBind`)~~ feito — tipos em `src/vue/chrome/dock-model.ts`
3. ~~`useExport`, `useChromeLayout`, `useNotationPrefs`~~ feito. Falta `useAutoScroll` / `useEditSession` (por último)
4. Partir `useOverlay` / `useBlockEdit`
5. Core: fatiar `import-chordpro.ts`; walker `{sot}`/`x_titan_start_of_score`; **não** unificar `beatsPerBar` 6/8 nem wrap PDF/CSS/slides
6. Demo HTML / `CifraDemo` bind; zip interno
7. `docs:build` a partir de `docs/features/`
8. Relatório final para o usuário (a partir de `decisions.md`)

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
