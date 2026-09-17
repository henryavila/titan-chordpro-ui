# Design — Modos de edição + sugerir revisão (`edit-modes-suggest`)

> Ratificado B2 (2026-03-26): entrevista B0 + debate gate (Priya / Aria / Uma / Devon contrarian) + reabertura multiplayer/merge/notify.  
> Paths: `projects/titan-chordpro-ui/edit-modes-suggest/` · naming: `docs/NAMING.md` · consumer: `docs/CONSUMER.md` §10.

## Interview

| Campo | Decisão ratificada (B0 + reabertura) |
|---|---|
| **Problema** | O viewer força o músico a escolher “Só para mim / Para todos” (`modes=both` + ModePick), mas o **host já sabe** o contexto (frontend vs backend/PDP). O contrato certo é **um modo por mount**. Além disso, o fluxo sugerir→admin revisar precisa fechar de ponta a ponta (incluindo status para o músico e merge assistido). |
| **In-scope** | Prop singular `editMode: 'local' \| 'persisted' \| 'none'` (não colide com `mode: view\|edit`); remover ModePick/`both`; renomear literal `content`→`persisted`; local = overlay no device + Sugerir opcional; fila no pacote (`ChartStore`) **+** emits; admin em `persisted` = lista/diff + **preview assistido** + Aceitar lote/Recusar; status das sugestões do músico na Minha versão (filas resolvidas **arquivadas**, não apagadas); arestas `baseVersion`/op stale; docs CONSUMER/README/demos/testes. |
| **Out-of-scope** | Auth/contas no pacote; **multiplayer ao vivo** (co-edição realtime da cifra oficial) — só menção futura; merge 3-way **silencioso** (gravar sem validação humana); push/e-mail/WhatsApp dentro do pacote; redesenho amplo do chrome além do necessário ao contrato. |
| **Done-when (design)** | Contrato `editMode` + seam emit/inject + merge assistido (preview+lote) + status músico (lifecycle archive) + conflitos documentados; critic Approved + aprovação explícita do usuário. |
| **Stakes** | Breaking na API pública (`modes`/`content`/`both`); forma dos emits de sugestão (vira contrato cross-app); default de `editMode`; não mentir que ChartStore default cruza frontend↔backend; não colidir com prop `mode` view\|edit. |
| **Fontes** | `docs/CONSUMER.md` §10, `README.md` (modes/suggestions/storage), `src/vue/public.ts`, `src/vue/overlay/ModePickDialog.vue`, `SuggestionQueue.vue`, `MyVersionPanel.vue`, `src/vue/use/useOverlay.ts`, `src/core/overlay.ts` (`Suggestion`), `src/core/storage.ts`, `demo/host/recipe.ts`, `research-digest.md` deste plano. |

## Context

Hoje o host liga edição com `modes: 'none' | 'local' | 'content' | 'both'`. Com `both`, `ModePickDialog` pergunta “Só para mim” vs “Para todos” antes de editar. verified_by: `src/vue/public.ts` (`ModesProp`, `WriteMode`), `src/vue/overlay/ModePickDialog.vue`, `ChordproViewer.vue` (~3077).

A demo defaulta `both` (`demo/host/recipe.ts` `writeModes`). O caso de uso real do consumidor é o oposto: **frontend = local**, **backend/PDP = persisted** — um papel por instância.

O pipeline de sugestão **já existe** no pacote: overlay pessoal → “Sugerir alteração ao responsável” → `cpv:sug` → fila (cifras → pedidos → ops) → Aceitar/Recusar com warn “Não encaixa mais…”. verified_by: `useOverlay.ts` (`suggest`, `acceptOp`, `refuseOp`), `SuggestionQueue.vue`, `MyVersionPanel.vue`, `STORE_KEYS.suggestions` em `storage.ts`.

O buraco de produto não é “inventar Aceitar”: é (1) matar o select de papel, (2) renomear o contrato, (3) **seam cross-app** (emit + inject; default `localStorage` não atravessa apps), (4) **merge assistido** (preview + lote), (5) **status para o músico**.

## Decisions

1. **Um papel de escrita por mount.** Prop pública singular: `editMode?: 'local' | 'persisted' | 'none'` (default **`local`**, igual ao default atual de `modes`). **Não** reutilizar `mode` — essa prop já é `view | edit` (chrome). verified_by: `src/vue/public.ts` (`mode?: 'view' | 'edit'`, `modes?: ModesProp`, emit `update:mode`).
2. **Remover `both` e o ModePick.** Entrar em edit usa o único `editMode` do mount. Sem pergunta “Só para mim / Para todos”.
3. **Rename `content` → `persisted`.** Literal TypeScript/API em inglês; labels de chrome em PT **mantidas** neste ciclo (“Só para mim”, “Para todos”, “Sugerir…”, “Sugestões dos músicos”) — microcopy familiar (Uma).
4. **Compat por um MINOR.** `modes` (plural) e literal `content` aceitos como **deprecated aliases** → mapeiam para `editMode` / `persisted`; `both` emite warning e comporta-se como **`local`** (edição pessoal + suggest; sem save oficial pelo picker). Remoção hard no MINOR seguinte. (Meio-termo Devon + Priya.)
5. **Jornada `local` (frontend):** editar grava overlay no device via `ChartStore`; “Sugerir” é **opcional e explícito**; confirmação leve “Enviar sugestão?” → grava fila + **emit** → toast → **fecha** painel; overlay local **permanece** (cópia enviada ≠ apagar rascunho).
6. **Jornada `persisted` (backend/admin):** editar oficial emite `save-content` (nome do emit permanece neste ciclo; documentar como save do oficial); UI de fila visível; ao abrir um pedido, **merge assistido**: engine classifica cada op (`applies` | `conflict`), mostra preview do texto resultante se o lote limpo fosse aplicado; admin **Aceitar lote** / **Recusar** (e continua podendo Aceitar/Recusar item a item). **Nada grava no oficial até confirmação.** Aceitar lote = **um** `applyOps` sequencial das ops `applies` + **um** `save-content` / um bump de versão (não N bumps).
7. **Seam cross-app (notify camada 1):** emits `suggestion-created` / `suggestion-accepted` / `suggestion-refused`. Prop **`suggestionQueue?: Suggestion[]`** = espelho **completo** (todos os status). Distinto de `suggestions?: boolean` (capability — **mantida**, default `true`). **Leitura:** se `suggestionQueue !== undefined`, prop vence o ChartStore. **Escrita com inject:** pacote **não** usa store como SoT — emite o evento, faz **merge otimista** na cópia em memória (UI da sessão), e emite `update:suggestionQueue` para o host persistir e re-passar a prop. Sem inject: grava no ChartStore + emite. Sem emit/queue cross-app = teatro no mesmo browser.
8. **Status músico + lifecycle:** Aceitar/Recusar/lote **não apagam**. Movem ops para `resolvedOps` com `disposition: 'accepted' | 'refused'`. Admin UI filtra `pending` + `partial` com ops abertas. Minha versão lista todos os status da `songId` (+ filtro `actorKey`). Hoje `dropSugOp` remove — **muda**. verified_by: `useOverlay.ts`. Sem push.
8b. **Refresh cross-device:** pacote não escuta admin remoto. Host persiste após emits e devolve a fila na próxima visita. **Mesma sessão do remetente:** merge otimista já mostra `pending`; `accepted`/`refused` chegam na visita seguinte (ou se o host re-passar a prop).
8c. **Invariante de emits no Aceitar/Recusar:**
    - Aceitar (item ou lote) que altera o oficial → **sempre** o par `save-content` + `suggestion-accepted` com `officialText` **igual** ao payload de `save-content`.
    - Item: um par por op; `status` = `partial` se ainda há ops abertas, senão `accepted`.
    - Lote Aceitar: um `applyOps` das `applies` + **um** par emits (um bump).
    - Recusar (item ou lote das restantes): só `suggestion-refused` (sem `save-content`). Lote Recusar = recusa **todas** as ops abertas.
    - Terminal: todas accepted → `accepted`; todas refused → `refused`; mistura → `partial` (histórico misto, mesmo sem ops abertas).
9. **“Sugestões dele” sem auth:** `actorKey?: string` opcional (prop no mount local; stamp em create). Sem key, Minha versão mostra o que a SoT trouxe para a `songId` (host pré-filtra). Pacote não inventa identidade.
10. **Conflitos:** âncora quebrada → `conflict` no preview; lote Aceitar aplica só `applies`; conflitos ficam no pedido (`partial` / `pending` se nada aplicou) com warn. Sem rebase silencioso.
11. **Multiplayer ao vivo: OUT** deste ciclo; **mencionado** em Non-goals / Open questions como possível depois (presença/locks/sync). Não confundir com “vários músicos sugerindo assíncrono” (já in-scope).
12. **Auth OUT** do pacote: identidade do sugeridor e permissão de admin são do host/PDP (`actorKey` é opaque string, não login).
13. **Semver:** mudança de contrato público = **MINOR** com deprecações; remoção dos aliases = MINOR seguinte. Skill `release` decide o bump — não chutar patch. verified_by: Agents.md §11 / `.grok/skills/release`.

### Contrato host (sketch)

```ts
type EditMode = 'local' | 'persisted' | 'none'

type SuggestionStatus = 'pending' | 'accepted' | 'refused' | 'partial'

type ResolvedOp = OverlayOp & { disposition: 'accepted' | 'refused' }

type Suggestion = {
  id: string
  songId: string
  title: string
  at: number
  baseVersion: string
  ops: OverlayOp[]              // still-open ops
  resolvedOps?: ResolvedOp[]    // archived with per-op disposition
  status: SuggestionStatus      // default 'pending' on create
  actorKey?: string             // opaque; host-scoped
}

// ChordproViewer props (conceptual)
// mode?: 'view' | 'edit'     // UNCHANGED — chrome axis
editMode?: EditMode           // write-role axis (new)
suggestions?: boolean         // UNCHANGED capability — may the reader send suggestions? default true
actorKey?: string             // optional; stamped on suggestion-created
suggestionQueue?: Suggestion[] // full mirror (all statuses); when set, wins reads over ChartStore
// deprecated: modes?: 'none' | 'local' | 'content' | 'both' | EditMode

// emits (additive)
'suggestion-created': [Suggestion]
'update:suggestionQueue': [Suggestion[]] // host persistence round-trip when inject is used
'suggestion-accepted': [{
  id: string
  songId: string
  opIds: string[]
  status: SuggestionStatus
  officialText: string  // MUST equal the concurrent save-content payload
}]
'suggestion-refused': [{ id: string; songId: string; opIds: string[]; status: SuggestionStatus }]
// existing
'save-content': [value: string]
'update:mode': ['view' | 'edit']
```

## Chosen approach

**Abordagem escolhida: contrato de papel único (`editMode`) + reuse do pipeline de overlay/fila + seam emit/inject + merge assistido (preview + lote) + status do músico com archive (não delete).**

Pesos do debate, reabertura e critic round 1:

| Voz | O que pesou |
|---|---|
| **Priya** | ModePick é ruído; menor validação = um papel no mount; emit obrigatório para cross-app |
| **Aria** | papel singular; store+emit+inject; API EN (`persisted`); reuse não rebuild; blast radius da forma do emit |
| **Uma** | Confirmação leve + fechar painel; manter labels PT familiares; sem tracker push |
| **Devon (dissent)** | Preferia só alias + ChartStore sem emit e janela longa de `both` — acolhido como **deprecação MINOR**, não como “nunca emitir” |
| **Usuário (reabertura)** | Multiplayer OUT com menção; merge = engine classifica + admin valida (preview+lote); notify = emit + lista de status na Minha versão |
| **Critic F-001** | Prop não pode se chamar `mode` — colide com `view\|edit` → **`editMode`** |
| **Critic F-002** | Aceitar/Recusar não podem só `dropSugOp`; precisam marcar status / arquivar ops |

## Rejected alternatives

1. **Manter `modes=both` + ModePick** — rejeitado: host já sabe o papel; select confunde músico.  
2. **ChartStore-only sem emit** (Devon) — rejeitado como único seam: default `browserStore` = device; frontend≠backend. ChartStore compartilhado permanece **opcional**.  
3. **Token PT `persistido` na API TypeScript** — rejeitado (Priya/Aria/Uma/Devon): API EN, UI PT.  
4. **Auto-aplicar ops limpas sem confirmação** — rejeitado: usuário escolheu preview + Aceitar lote (nada grava até validar).  
5. **Rebuild da UX de fila** — rejeitado: `SuggestionQueue` + `acceptOp` já existem; estender com classificação/lote.  
6. **Status tracking via push no pacote** — rejeitado: canal externo é do PDP.  
7. **Multiplayer realtime neste ciclo** — rejeitado / adiado (menção apenas).  
8. **Reusar prop `mode` para local\|persisted** — rejeitado (critic): colide com `mode: view\|edit` em `public.ts`.  
9. **Continuar apagando sugestões no Aceitar/Recusar** — rejeitado (critic): quebra status na Minha versão.

## Blast radius

| Porta | Risco | Contenção |
|---|---|---|
| `modes` → `editMode` + `content` → `persisted` | Hosts/demos/testes quebram | Alias deprecated 1 MINOR; CONSUMER + CHANGELOG; demos/`writeModes`/`Harness` atualizam já; **`mode` view\|edit intocado** |
| Remover ModePick / `both` | Embeds que dependiam do picker | `both` → warning + comportamento `local`; hosts passam `editMode` explícito |
| Novos emits + `status` / `resolvedOps` | Contrato cross-app + store shape | Campos additive; migração: entradas antigas sem `status` = `pending`; sem exigir auth |
| Parar de deletar na fila | Store cresce; admin UI precisa filtrar pending | Fila admin filtra `pending`/`partial`; GC/host purge fica Open Q |
| Merge assistido (lote) | UX admin vs só item a item | Item a item permanece; lote = um apply + um save |
| Default `editMode` | UX silenciosa se mudar | **Manter default `local`** (igual hoje) |

## Non-goals

- Contas, login, ACL dentro de `@henryavila/titan-chordpro-ui`.  
- Co-edição ao vivo / presença / locks (futuro possível; ver Open questions).  
- Merge que grava no oficial sem o admin confirmar.  
- Push, e-mail, WhatsApp, webhooks implementados no pacote.  
- Renomear agora todas as strings “Só para mim / Para todos” (pass de microcopy separado).  
- Inventar segundo SoT além de source ChordPro + overlay ops.

## Open questions

1. **Nome do emit `save-content`:** manter (menos churn) — **decidido neste doc**: manter + documentar.  
2. **`partial`:** **decidido**: um pedido → `status: 'partial'`; ops abertas em `ops`, resolvidas em `resolvedOps`.  
3. **Multiplayer futuro:** se um dia entrar, é host-owned (CRDT/OT fora do pacote) ou session lock simples no PDP? Só menção; não decide agora.  
4. **GC da fila arquivada:** quem purgeia sugestões `accepted`/`refused` antigas — pacote (TTL) ou só o host? Preferência: **host** (pacote não apaga por default).  
5. **TTL / limite** de arquivados no device store — plan pode capar por song; não bloqueia o design.  
6. **Inject prop:** **decidido** — `suggestionQueue` = fila completa; UI admin filtra; status do músico lê a mesma SoT.  
7. **Write path com inject / dual emit:** **decidido pós-critic-3** — Decisions 7 + 8c (`update:suggestionQueue`, merge otimista, `save-content`∥`suggestion-accepted`).  
8. **Tune ops no lote:** herdam a regra atual de `acceptOp` (tune não reescreve texto oficial da mesma forma); plan espelha o comportamento existente — não bloqueia o design.

## Self-review against code-quality gates

- G1 read-before-claim: applied — claims sobre ModePick, ModesProp, SuggestionQueue, useOverlay, STORE_KEYS, writeModes com paths no Context/Decisions / research-digest.  
- G2 soft-language: applied — decisions usam deve/permanece/remove; sem “talvez/consideravelmente” nas Decisions.  
- G6 reference-or-strike: applied — claims de código existente com verified_by; sketch de emits novos marcado como conceptual até o plan.
