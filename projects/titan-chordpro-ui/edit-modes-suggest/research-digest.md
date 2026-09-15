# Research digest — edit-modes-suggest

## Scope (from Interview)

- Remover o select “Só para mim / Para todos”; host monta o viewer em **um** modo (`local` | `persistido` | `none`).
- Renomear `content` → `persistido`; eliminar `both`.
- Local: edição no device; “Sugerir revisão” opcional.
- Fila de sugestões no pacote (`ChartStore` / `cpv:sug` + emit).
- Persistido: UI lista/diff/Aceitar|Recusar no viewer.
- Edge: `baseVersion` / op que não encaixa mais.
- Fora: auth no pacote. Aberto: multiplayer, merge 3-way, notificações.

## Findings

- **`src/vue/public.ts`**: contrato atual `WriteMode = 'local' | 'content'`, `ModesProp = 'none' | 'local' | 'content' | 'both'`. Prop `suggestions?: boolean`. Emit `save-content`. Não há emit de “sugestão enviada”.
- **`src/vue/overlay/ModePickDialog.vue` + `ChordproViewer.vue` (~3077)**: com `modes="both"` o músico escolhe “Só para mim” vs “Para todos” antes de editar. É exatamente o select a remover.
- **`demo/host/recipe.ts` `writeModes`**: demo defaulta `both` (exceto `criar=1` → `content`). Harness de browser (`tests/browser/Harness.vue`) ainda tem `<select id="host-modes">`.
- **Overlay / suggest já existem**: `src/core/overlay.ts` tipo `Suggestion`; `src/vue/use/useOverlay.ts` grava fila em `STORE_KEYS.suggestions` (`cpv:sug`), `suggest()`, `acceptOp` / `refuseOp` com `applyOps` + warn “Não encaixa mais na cifra atual”, bump de versão via `setOfficial` → `onSaveContent`.
- **UI de fila**: `SuggestionQueue.vue` (cifras → pedidos → ajustes, Aceitar/Recusar). Entrada no menu “Sugestões dos músicos” só quando `modes.includes('content')` (`ChordproViewer.vue` ~3062, badge ~845).
- **Local + botão sugerir**: `MyVersionPanel.vue` “Sugerir alteração ao responsável” gated por `canSuggest` (= overlay + `suggestions !== false`). Alinha com a entrevista (suggest opcional após editar local).
- **`src/core/storage.ts`**: `ChartStore` síncrono; comentário diz que `cpv:sug` deveria atravessar pessoas no servidor, mas o default é `browserStore()` = `localStorage` — sugestão só cruza dispositivos/pessoas se o **host** injeta store compartilhado. README § storage confirma isso.
- **Labels / comportamento por modo**: `CpvEditHead` / `SelectionBar` / `CpvEditDock` ainda falam “Só para mim” / “Para todos”; delete real só em `content`; local só oculta.
- **Docs**: `docs/CONSUMER.md` §10 e README props documentam `both`/`content` e o fluxo suggest item-a-item.

## Open risks / seams

1. **Fila no mesmo `localStorage` não serve frontend→backend**: músico no app público e admin no PDP precisam do mesmo `ChartStore` (conta/servidor) ou de um emit + prop de sugestões injetadas. Hoje `suggest()` só escreve no store; sem emit o host não é notificado.
2. **Breaking**: remover `both` + renomear `content` → `persistido` toca public API, demos, testes Vue/browser, CONSUMER/README.
3. **Nome da prop**: entrevista usou `mode` singular; código tem `modes` (plural, lista). Decidir se vira `mode: 'local' | 'persistido' | 'none'` ou mantém `modes` com um valor só.
4. **Quem vê a fila**: hoje gated a `content`. No modelo novo, fila só faz sentido em `persistido` (admin). Em `local`, só enviar.
5. **Lacuna vs “implementar todo o fluxo”**: core do suggest/review já está; o trabalho real é contrato de modo único + rename + seam host↔fila cross-app + copy UX — não reinventar Aceitar/Recusar.
