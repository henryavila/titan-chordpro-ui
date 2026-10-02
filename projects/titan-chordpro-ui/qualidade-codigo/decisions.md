# Canônicos de UI — qualidade-codigo

O usuário aceitou **todas as recomendações**. Cada linha: opções que existiam → escolha. Validação no final, depois da implementação.

Densidade (44 telefone / 36 computador) **não** é uma segunda peça: é prop `density` do mesmo componente. Layout de ensaio (Mais no telefone, barra no computador) permanece.

| Família | Opções | Escolha | Por quê |
|---|---|---|---|
| **Rolar / Parar** | (1) C+D 36px em todo lugar. (2) A+B 44px sem borda em todo lugar. (3) C+D no visual, tamanho por tela. (4) outro. | **3** | Usuário. Idle `--chord`/`--chord-ink`; Parar `--pill`/`--pill-ink`; borda 1px; rótulo sempre (some só em 320px). 44/700/r14 no telefone, 36/600/r12 no computador. |
| **A− / A+** | (1) 36×36 soltos em todo lugar. (2) bandeja 44 em todo lugar. (3) um componente, tamanho por tela. (4) outro. | **3** | Usuário. Bandeja `--surface` + 44 no telefone; 36×36 no computador e na edição. `title` nos dois. |
| **Ajuste** | (1) só ícone em todo lugar. (2) ícone+“Ajuste” em todo lugar. (3) ícone no telefone, palavra no computador. (4) outro. | **3** | Mesmo ligado (`--sel` / `--sel-line`) e `aria-pressed` nos dois. |
| **Graus / Nashville** | “Graus” na barra wide; “Nashville” no Mais; tokens `--chord-fill` vs `--chord-soft`. | **Graus** + tokens da barra (`--chord-fill` / `--chord` / `--chord-edge`) | Palavra curta do músico na superfície principal; Mais deixa de ser um segundo visual. |
| **Comentários** | Wide: “Comentários”, ícone sempre `eyeOff`. Mais: “Comentários de ensaio” + visíveis/ocultos. | Um botão: rótulo **Comentários**; ícone **eye** visível / **eyeOff** oculto; pressed = ocultos (`--sel`) | Ícone alinhado ao estado. |
| **Metrônomo (chrome)** | Wide `[data-met-btn]` 36; Mais sem o gancho, copy diferente. | Um `BarButton` / linha Mais com os **mesmos tokens**; `[data-met-btn]` também no Mais | Testes e AT encontram o controle no telefone. |
| **Batida / Ensaio (chrome)** | Wide `--chord-fill`; Mais `--chord-soft` ou sem pressed. | Tokens da barra (`--chord-fill`) | Um “ligado”. |
| **Editar** | Phone ícone sem `dirty`; wide “Editar · rascunho”. | Densidade: ícone 44 / rótulo 36; **dirty também no telefone** (`aria-label` + ponto) | Mesmo estado, duas densidades. |
| **Tema** | Wide ícone+label 36; Mais linha; Edit ícone 36. | Um botão, densidade; Mais continua linha 52 do overflow | Três faces → uma peça. |
| **Exportar (chrome)** | Wide ícone 36; Mais linha longa. | Densidade: ícone no wide, linha no Mais | Overflow do telefone. |
| **Setlist prev/lista/next** | Phone 44 bordered; wide 38 borderless; States 44. | Densidade 44/38; prev/next **com borda** nos dois; centro “próxima” no telefone, “Lista” no computador | States deixa de ser uma terceira receita. |
| **Velocidade − × +** | Phone faixa full-width; wide chip. | Um `ChromeSpeedHud` com `density: row \| chip` | Mesmos dados. |
| **Dica de Ajuste** | Phone dismiss 32; wide/edit 26. | Um hint, densidade | Mesma frase. |
| **Dual (formas / original)** | ViewHead 30×18; ToneSheet 34×20. | **34×20**, `role="switch"` | O maior é o que se toca. ViewHead usa o mesmo. |
| **Fila / sugestões** | Badge no Mais + chip flutuante no telefone **e** no wide. | Telefone: badge no Mais. Computador: chip. **Não os dois no telefone.** | Um caminho por densidade. |
| **Áudio de referência** | Headphones no telefone; chip com arte no wide. | Um SFC, duas faces (`inline` / `chip`); `v-bind` único no pai | Já extraído; só seca o bind. |
| **Opacity disabled (Rolar)** | 0,38 phone / 0,32 wide. | **0,32** | Um “off”. |
| **Hover de barra preenchida** | Classe `bar-btn` só `:hover`, inline ganha. | Base CSS + estados `is-chord` / `is-sel` / `is-live` | Hover volta a aparecer. |
| **Close X** | 24, 26, 28, 30, 32, 34, 36+surface, 38, 40, 44 bordered, 36 pill. | `IconButton` default **36**; `density=phone` **44**; workbench **40**; import **44 bordered**; diagrama pill fica variante `pill` | Um componente, tamanhos nomeados. |
| **Kicker / eyebrow** | 9,5/0,16em, 10/0,14em, 10,5, 11. | **9,5px / 0,16em / 700 / `--muted`** (classe `modal-kicker`) | Uma sobrancelha. |
| **Scrim** | blur 6px 0,18s e 5px 0,16s (last wins). | **6px / 0,18s**; apaga o segundo bloco | Um véu. |
| **Casca de dialog** | sheet+dialog, bottom-sheet, âncora sem scrim, workbench opaco, full-bleed. | `DialogShell` com `variant: center \| sheet \| anchor \| workbench \| bleed` | Especialização nomeada, não copy-paste. |
| **aria-modal** | Só alguns. | **sim** em center/sheet/workbench/bleed; **não** no metrônomo (âncora, cifra viva) | Intenção do metrônomo preservada. |
| **Escape** | `novaOpen` fora da pilha. | Nova entra na pilha Escape | Um teclado. |
| **Segmentado** | ReadingSwitch; export; metro som; diagrama; score; meta tabs. | `Seg` no padrão ReadingSwitch (`role=group`, `aria-pressed`, `--chord-fill`) para 2–3 opções. Meta tabs **continuam tablist**. | Tabs de verdade não viram seg. |
| **Stepper ±** | 60×56 tom; 48×44 capo; 34×32 pop; 34 metro; 32 meta. | `Stepper` sizes `lg` (tom) / `md` (capo) / `sm` (BPM, velocidade) | Não achatar o tom de 60px. |
| **Switch (thumb)** | 34×20, 30×18, 28×16; role misturado. | **34×20** `role="switch"`; metrônomo e batida usam o mesmo | Um interruptor. |
| **Chip (compasso, tom, menor)** | Meta e Nova quase iguais, APIs diferentes. | `Chip` único; Meta e Nova consomem | DRY da ficha. |
| **Campos da ficha** | MetaDialog 935 vs NewChartDialog 659 copiam duration/BPM/time/key. | `ChartIdentityFields` | Uma ficha. |
| **Ação primária** | `--pill` (modal-btn) vs `--chord` 48h (Meta/Nova) vs `--pill` 32h (fila). | `ActionButton`: `chord` (grava cifra) / `pill` (aceitar/keep) / `danger` / `ghost` | Duas cores com nome, não três sistemas. |
| **Lista (setlist, fila, minha versão)** | Alturas 56/52, r13/r14. | `ListRow` min 56 r14 | Uma linha. |
| **Accept/Refuse** | Copiado em lote e por op na fila. | Um par no `ListRow` | Uma receita. |
| **Score editor `.edp*`** | Namespace fora de `titan-chordpro-*`. | Prefixo `titan-chordpro-edp-*` (classes); DOM público inalterado | Naming lock. |
| **renderHtml vs ChartBody** | Dois HTML. | **Não unificar** | CLI/snapshot A6 vs UI viva. |
| **Wrap PDF / CSS / slides** | Três medidas. | **Não unificar** | Três mídias. |
| **beatsPerBar 6/8** | 2 (rolagem) vs 3 (partitura). | **Não unificar** | Semântica diferente. |
| **OnSong silencioso vs import** | Dois conversores. | **Não fundir nesta leva** | Comentário pede fixture na frente. |
| **Filename título vazio** | `cifra-.pdf` vs `cifra-cifra.pdf`. | **Não “consertar”** | Mudaria download. |
| **Controller vs Vue** | Duas máquinas de estado. | Vue **não** passa a usar o controller nesta leva | Capo do controller está morto; ligar muda HTML. |

## Componentes do dicionário (todos)

`src/vue/ui/` — um arquivo por peça, catálogo em `projects/.../catalog/`.

RollButton, TypePair, BarButton, IconButton, SpeedHud, FitHint, SetlistNav, DualSwitch, Seg, Stepper, Chip, SwitchRow, DialogShell, Kicker, ActionButton, ListRow, ChartIdentityFields, DialogClose (= IconButton).

ReadingSwitch e AudioRef já existem; só entram no dicionário.

## Docs

Pacote `docs/features/<id>.md` por extração. Gerador de CONSUMER/README quando existirem ≥3 pacotes. VISAO, SPEC, NAMING, MARCAS-X e CHANGELOG continuam manuais.
